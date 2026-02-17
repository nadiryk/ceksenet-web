-- =====================================================
-- Telegram Bot Ayarları
-- =====================================================

-- 1. AYARLAR TABLOSUNA TELEGRAM AYARLARI EKLEME
INSERT INTO ayarlar (key, value) VALUES
  ('telegram_bot_token', ''),
  ('telegram_chat_id', ''),
  ('telegram_mesaj_sablonu', '📋 *{evrak_tipi} Bilgisi*

*Evrak No:* {evrak_no}
*Tutar:* {tutar}
*Para Birimi:* {para_birimi}
*Vade:* {vade_tarihi}
*Durum:* {durum}
*Cari:* {cari}
*Banka:* {banka}
*Keşideci:* {kesideci}

[Detayları görüntüle]({evrak_url})'),
  ('telegram_aktif', 'false')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value;

-- 2. TELEGRAM GÖNDERİM LOGLARI TABLOSU
CREATE TABLE telegram_loglari (
    id SERIAL PRIMARY KEY,
    chat_id TEXT NOT NULL,
    mesaj TEXT NOT NULL,
    durum TEXT NOT NULL CHECK(durum IN ('gonderildi', 'hata', 'bekliyor')),
    hata_mesaji TEXT,
    evrak_id INTEGER REFERENCES evraklar(id) ON DELETE SET NULL,
    gonderim_tarihi TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE telegram_loglari ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Telegram logları viewable by authenticated"
ON telegram_loglari FOR SELECT TO authenticated USING (true);

CREATE POLICY "Telegram logları insertable by authenticated"
ON telegram_loglari FOR INSERT TO authenticated WITH CHECK (true);

-- Indexes
CREATE INDEX idx_telegram_log_chat_id ON telegram_loglari(chat_id);
CREATE INDEX idx_telegram_log_durum ON telegram_loglari(durum);
CREATE INDEX idx_telegram_log_evrak ON telegram_loglari(evrak_id);

-- =====================================================
-- TAMAMLANDI!
-- =====================================================