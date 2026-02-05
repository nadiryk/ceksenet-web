-- =====================================================
-- WhatsApp Bildirimleri için Ayarlar ve Trigger'lar
-- =====================================================

-- 1. AYARLAR TABLOSUNA WHATSAPP TELEFONLARI EKLEME
-- Mevcut ayarları güncelle
UPDATE ayarlar SET key = 'whatsapp_telefon_1' WHERE key = 'whatsapp_telefon';

-- Yeni ayarları ekle
INSERT INTO ayarlar (key, value) VALUES
  ('whatsapp_telefon_2', ''),
  ('whatsapp_telefon_3', ''),
  ('whatsapp_odeme_hatirlatma_mesaj', 'Sayın {cari_adi},

{evrak_tipi} ödeme hatırlatması:
Evrak No: {evrak_no}
Tutar: {tutar}
Vade: {vade_tarihi}
Kalan gün: {kalan_gun}

Lütfen ödemenizi yapınız.'),
  ('whatsapp_degisiklik_mesaj', 'Sayın {cari_adi},

{evrak_tipi} durumu değişti:
Evrak No: {evrak_no}
Yeni Durum: {durum}
Tutar: {tutar}
Vade: {vade_tarihi}

Bilgilerinize sunarız.'),
  ('whatsapp_odeme_hatirlatma_gun', '2'),
  ('whatsapp_aktif', 'true');

-- 2. WHATSAPP GÖNDERİM LOGLARI TABLOSU
CREATE TABLE whatsapp_loglari (
    id SERIAL PRIMARY KEY,
    telefon TEXT NOT NULL,
    mesaj TEXT NOT NULL,
    durum TEXT NOT NULL CHECK(durum IN ('gonderildi', 'hata', 'bekliyor')),
    hata_mesaji TEXT,
    evrak_id INTEGER REFERENCES evraklar(id) ON DELETE SET NULL,
    kredi_taksit_id INTEGER REFERENCES kredi_taksitler(id) ON DELETE SET NULL,
    cari_id INTEGER REFERENCES cariler(id) ON DELETE SET NULL,
    gonderim_tarihi TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE whatsapp_loglari ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Loglar viewable by authenticated"
ON whatsapp_loglari FOR SELECT TO authenticated USING (true);

CREATE POLICY "Loglar insertable by authenticated"
ON whatsapp_loglari FOR INSERT TO authenticated WITH CHECK (true);

-- Indexes
CREATE INDEX idx_whatsapp_log_telefon ON whatsapp_loglari(telefon);
CREATE INDEX idx_whatsapp_log_durum ON whatsapp_loglari(durum);
CREATE INDEX idx_whatsapp_log_evrak ON whatsapp_loglari(evrak_id);

-- 3. EVRAK DEĞİŞİKLİĞİ TRIGGER'ı
-- Evrak tablosunda INSERT/UPDATE olduğunda WhatsApp bildirimi tetikleyen fonksiyon
CREATE OR REPLACE FUNCTION public.notify_whatsapp_on_evrak_change()
RETURNS trigger AS $$
DECLARE
    telefon1 TEXT;
    telefon2 TEXT;
    telefon3 TEXT;
    whatsapp_aktif BOOLEAN;
    mesaj_template TEXT;
    cari_adi TEXT;
    final_mesaj TEXT;
BEGIN
    -- WhatsApp aktif mi kontrol et
    SELECT value INTO whatsapp_aktif FROM ayarlar WHERE key = 'whatsapp_aktif';
    IF whatsapp_aktif != 'true' THEN
        RETURN NEW;
    END IF;

    -- Telefon numaralarını al
    SELECT value INTO telefon1 FROM ayarlar WHERE key = 'whatsapp_telefon_1';
    SELECT value INTO telefon2 FROM ayarlar WHERE key = 'whatsapp_telefon_2';
    SELECT value INTO telefon3 FROM ayarlar WHERE key = 'whatsapp_telefon_3';

    -- Cari adını al
    SELECT ad_soyad INTO cari_adi FROM cariler WHERE id = NEW.cari_id;

    -- Mesaj şablonunu al
    SELECT value INTO mesaj_template FROM ayarlar WHERE key = 'whatsapp_degisiklik_mesaj';

    -- Mesajı formatla
    final_mesaj := replace(mesaj_template, '{cari_adi}', COALESCE(cari_adi, 'Müşteri'));
    final_mesaj := replace(final_mesaj, '{evrak_tipi}', NEW.evrak_tipi);
    final_mesaj := replace(final_mesaj, '{evrak_no}', NEW.evrak_no);
    final_mesaj := replace(final_mesaj, '{tutar}', NEW.tutar::text || ' ' || NEW.para_birimi);
    final_mesaj := replace(final_mesaj, '{vade_tarihi}', NEW.vade_tarihi::text);
    final_mesaj := replace(final_mesaj, '{durum}', NEW.durum);

    -- Log kaydı oluştur (gerçek gönderim için queue)
    IF telefon1 IS NOT NULL AND telefon1 != '' THEN
        INSERT INTO whatsapp_loglari (telefon, mesaj, durum, evrak_id)
        VALUES (telefon1, final_mesaj, 'bekliyor', NEW.id);
    END IF;
    IF telefon2 IS NOT NULL AND telefon2 != '' THEN
        INSERT INTO whatsapp_loglari (telefon, mesaj, durum, evrak_id)
        VALUES (telefon2, final_mesaj, 'bekliyor', NEW.id);
    END IF;
    IF telefon3 IS NOT NULL AND telefon3 != '' THEN
        INSERT INTO whatsapp_loglari (telefon, mesaj, durum, evrak_id)
        VALUES (telefon3, final_mesaj, 'bekliyor', NEW.id);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger'lar
DROP TRIGGER IF EXISTS evrak_change_whatsapp ON evraklar;
CREATE TRIGGER evrak_change_whatsapp
    AFTER INSERT OR UPDATE OF durum ON evraklar
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_whatsapp_on_evrak_change();

-- 4. GÜNLÜK ÖDEME HATIRLATMA FONKSİYONU
-- Bu fonksiyon cron tarafından çağrılacak
CREATE OR REPLACE FUNCTION public.send_payment_reminders()
RETURNS void AS $$
DECLARE
    reminder_day TEXT;
    telefon1 TEXT;
    telefon2 TEXT;
    telefon3 TEXT;
    mesaj_template TEXT;
    rec RECORD;
    final_mesaj TEXT;
BEGIN
    -- WhatsApp aktif mi kontrol et
    PERFORM 1 FROM ayarlar WHERE key = 'whatsapp_aktif' AND value = 'true';
    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- Hatırlatma günü (varsayılan 2)
    SELECT COALESCE(value, '2') INTO reminder_day FROM ayarlar WHERE key = 'whatsapp_odeme_hatirlatma_gun';

    -- Telefon numaralarını al
    SELECT value INTO telefon1 FROM ayarlar WHERE key = 'whatsapp_telefon_1';
    SELECT value INTO telefon2 FROM ayarlar WHERE key = 'whatsapp_telefon_2';
    SELECT value INTO telefon3 FROM ayarlar WHERE key = 'whatsapp_telefon_3';

    -- Mesaj şablonunu al
    SELECT value INTO mesaj_template FROM ayarlar WHERE key = 'whatsapp_odeme_hatirlatma_mesaj';

    -- Vadesi reminder_day gün içinde olan evrakları bul
    FOR rec IN
        SELECT e.*, c.ad_soyad as cari_adi,
               (e.vade_tarihi - CURRENT_DATE) as kalan_gun
        FROM evraklar e
        LEFT JOIN cariler c ON e.cari_id = c.id
        WHERE e.durum IN ('portfoy', 'bankada', 'ciro')
          AND e.vade_tarihi > CURRENT_DATE
          AND (e.vade_tarihi - CURRENT_DATE) <= reminder_day::integer
    LOOP
        -- Mesajı formatla
        final_mesaj := replace(mesaj_template, '{cari_adi}', COALESCE(rec.cari_adi, 'Müşteri'));
        final_mesaj := replace(final_mesaj, '{evrak_tipi}', rec.evrak_tipi);
        final_mesaj := replace(final_mesaj, '{evrak_no}', rec.evrak_no);
        final_mesaj := replace(final_mesaj, '{tutar}', rec.tutar::text || ' ' || rec.para_birimi);
        final_mesaj := replace(final_mesaj, '{vade_tarihi}', rec.vade_tarihi::text);
        final_mesaj := replace(final_mesaj, '{kalan_gun}', rec.kalan_gun::text);

        -- Log kaydı oluştur
        IF telefon1 IS NOT NULL AND telefon1 != '' THEN
            INSERT INTO whatsapp_loglari (telefon, mesaj, durum, evrak_id)
            VALUES (telefon1, final_mesaj, 'bekliyor', rec.id);
        END IF;
        IF telefon2 IS NOT NULL AND telefon2 != '' THEN
            INSERT INTO whatsapp_loglari (telefon, mesaj, durum, evrak_id)
            VALUES (telefon2, final_mesaj, 'bekliyor', rec.id);
        END IF;
        IF telefon3 IS NOT NULL AND telefon3 != '' THEN
            INSERT INTO whatsapp_loglari (telefon, mesaj, durum, evrak_id)
            VALUES (telefon3, final_mesaj, 'bekliyor', rec.id);
        END IF;
    END LOOP;

    -- Ayrıca kredi taksitleri için de hatırlatma yapabiliriz (opsiyonel)
    -- Burada kredi taksitleri için de benzer bir döngü eklenebilir
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TAMAMLANDI!
-- =====================================================