-- =====================================================
-- CekSenet Web - Initial Database Schema
-- Supabase PostgreSQL
-- Created: 19 Ocak 2026
-- =====================================================

-- =====================================================
-- 1. PROFILES (users yerine - Supabase Auth ile entegre)
-- =====================================================
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    ad_soyad TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'normal' CHECK(role IN ('admin', 'normal')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ
);

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles viewable by authenticated"
ON profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Admins can insert profiles"
ON profiles FOR INSERT TO authenticated 
WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  OR NOT EXISTS (SELECT 1 FROM profiles)
);

CREATE POLICY "Admins can delete profiles"
ON profiles FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- =====================================================
-- 2. AUTH TRIGGER (Otomatik Profile Oluşturma)
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, ad_soyad, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'ad_soyad', 'Yeni Kullanıcı'),
    COALESCE(new.raw_user_meta_data->>'role', 'normal')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- 3. BANKALAR
-- =====================================================
CREATE TABLE bankalar (
    id SERIAL PRIMARY KEY,
    ad TEXT NOT NULL UNIQUE,
    aktif BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE bankalar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Bankalar viewable by authenticated"
ON bankalar FOR SELECT TO authenticated USING (true);

CREATE POLICY "Bankalar insertable by authenticated"
ON bankalar FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Bankalar updatable by authenticated"
ON bankalar FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Bankalar deletable by authenticated"
ON bankalar FOR DELETE TO authenticated USING (true);

-- =====================================================
-- 4. CARILER
-- =====================================================
CREATE TABLE cariler (
    id SERIAL PRIMARY KEY,
    ad_soyad TEXT NOT NULL,
    tip TEXT NOT NULL CHECK(tip IN ('musteri', 'tedarikci')),
    telefon TEXT,
    email TEXT,
    adres TEXT,
    vergi_no TEXT,
    notlar TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

ALTER TABLE cariler ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cariler viewable by authenticated"
ON cariler FOR SELECT TO authenticated USING (true);

CREATE POLICY "Cariler insertable by authenticated"
ON cariler FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Cariler updatable by authenticated"
ON cariler FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Cariler deletable by authenticated"
ON cariler FOR DELETE TO authenticated USING (true);

-- =====================================================
-- 5. EVRAKLAR
-- =====================================================
CREATE TABLE evraklar (
    id SERIAL PRIMARY KEY,
    evrak_tipi TEXT NOT NULL CHECK(evrak_tipi IN ('cek', 'senet')),
    evrak_no TEXT NOT NULL,
    tutar DECIMAL(15,2) NOT NULL,
    para_birimi TEXT DEFAULT 'TRY' CHECK(para_birimi IN ('TRY', 'USD', 'EUR', 'GBP', 'CHF')),
    doviz_kuru DECIMAL(10,4),
    evrak_tarihi DATE,
    vade_tarihi DATE NOT NULL,
    banka_id INTEGER REFERENCES bankalar(id) ON DELETE SET NULL,
    banka_adi TEXT,
    kesideci TEXT,
    cari_id INTEGER REFERENCES cariler(id) ON DELETE SET NULL,
    durum TEXT NOT NULL DEFAULT 'portfoy' CHECK(durum IN ('portfoy', 'bankada', 'ciro', 'tahsil', 'karsiliksiz')),
    notlar TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE evraklar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Evraklar viewable by authenticated"
ON evraklar FOR SELECT TO authenticated USING (true);

CREATE POLICY "Evraklar insertable by authenticated"
ON evraklar FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Evraklar updatable by authenticated"
ON evraklar FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Evraklar deletable by authenticated"
ON evraklar FOR DELETE TO authenticated USING (true);

-- Indexes
CREATE INDEX idx_evraklar_durum ON evraklar(durum);
CREATE INDEX idx_evraklar_vade ON evraklar(vade_tarihi);
CREATE INDEX idx_evraklar_cari ON evraklar(cari_id);
CREATE INDEX idx_evraklar_banka ON evraklar(banka_id);

-- =====================================================
-- 6. EVRAK_HAREKETLERI
-- =====================================================
CREATE TABLE evrak_hareketleri (
    id SERIAL PRIMARY KEY,
    evrak_id INTEGER NOT NULL REFERENCES evraklar(id) ON DELETE CASCADE,
    eski_durum TEXT,
    yeni_durum TEXT NOT NULL,
    aciklama TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE evrak_hareketleri ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hareketler viewable by authenticated"
ON evrak_hareketleri FOR SELECT TO authenticated USING (true);

CREATE POLICY "Hareketler insertable by authenticated"
ON evrak_hareketleri FOR INSERT TO authenticated WITH CHECK (true);

-- Index
CREATE INDEX idx_hareketler_evrak ON evrak_hareketleri(evrak_id);

-- =====================================================
-- 7. EVRAK_FOTOGRAFLARI
-- =====================================================
CREATE TABLE evrak_fotograflari (
    id SERIAL PRIMARY KEY,
    evrak_id INTEGER NOT NULL REFERENCES evraklar(id) ON DELETE CASCADE,
    dosya_adi TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    thumbnail_path TEXT,
    dosya_boyutu INTEGER,
    mime_type TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE evrak_fotograflari ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Fotograflar viewable by authenticated"
ON evrak_fotograflari FOR SELECT TO authenticated USING (true);

CREATE POLICY "Fotograflar insertable by authenticated"
ON evrak_fotograflari FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Fotograflar updatable by authenticated"
ON evrak_fotograflari FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Fotograflar deletable by authenticated"
ON evrak_fotograflari FOR DELETE TO authenticated USING (true);

-- Index
CREATE INDEX idx_fotograflar_evrak ON evrak_fotograflari(evrak_id);

-- =====================================================
-- 8. KREDILER
-- =====================================================
CREATE TABLE krediler (
    id SERIAL PRIMARY KEY,
    banka_id INTEGER REFERENCES bankalar(id) ON DELETE SET NULL,
    kredi_turu TEXT NOT NULL CHECK(kredi_turu IN ('tuketici', 'konut', 'tasit', 'ticari', 'isletme', 'diger')),
    anapara DECIMAL(15,2) NOT NULL,
    faiz_orani DECIMAL(5,2) NOT NULL,
    vade_ay INTEGER NOT NULL,
    baslangic_tarihi DATE NOT NULL,
    aylik_taksit DECIMAL(15,2) NOT NULL,
    toplam_odeme DECIMAL(15,2),
    para_birimi TEXT DEFAULT 'TRY' CHECK(para_birimi IN ('TRY', 'USD', 'EUR', 'GBP', 'CHF')),
    notlar TEXT,
    durum TEXT DEFAULT 'aktif' CHECK(durum IN ('aktif', 'kapandi', 'erken_kapandi')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE krediler ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Krediler viewable by authenticated"
ON krediler FOR SELECT TO authenticated USING (true);

CREATE POLICY "Krediler insertable by authenticated"
ON krediler FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Krediler updatable by authenticated"
ON krediler FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Krediler deletable by authenticated"
ON krediler FOR DELETE TO authenticated USING (true);

-- Index
CREATE INDEX idx_krediler_durum ON krediler(durum);
CREATE INDEX idx_krediler_banka ON krediler(banka_id);

-- =====================================================
-- 9. KREDI_TAKSITLER
-- =====================================================
CREATE TABLE kredi_taksitler (
    id SERIAL PRIMARY KEY,
    kredi_id INTEGER NOT NULL REFERENCES krediler(id) ON DELETE CASCADE,
    taksit_no INTEGER NOT NULL,
    vade_tarihi DATE NOT NULL,
    tutar DECIMAL(15,2) NOT NULL,
    odeme_tarihi DATE,
    odenen_tutar DECIMAL(15,2),
    durum TEXT DEFAULT 'bekliyor' CHECK(durum IN ('bekliyor', 'odendi', 'gecikti')),
    notlar TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE kredi_taksitler ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Taksitler viewable by authenticated"
ON kredi_taksitler FOR SELECT TO authenticated USING (true);

CREATE POLICY "Taksitler insertable by authenticated"
ON kredi_taksitler FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Taksitler updatable by authenticated"
ON kredi_taksitler FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Taksitler deletable by authenticated"
ON kredi_taksitler FOR DELETE TO authenticated USING (true);

-- Indexes
CREATE INDEX idx_taksitler_kredi ON kredi_taksitler(kredi_id);
CREATE INDEX idx_taksitler_vade ON kredi_taksitler(vade_tarihi);
CREATE INDEX idx_taksitler_durum ON kredi_taksitler(durum);

-- =====================================================
-- 10. AYARLAR
-- =====================================================
CREATE TABLE ayarlar (
    key TEXT PRIMARY KEY,
    value TEXT
);

ALTER TABLE ayarlar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ayarlar viewable by authenticated"
ON ayarlar FOR SELECT TO authenticated USING (true);

CREATE POLICY "Ayarlar insertable by authenticated"
ON ayarlar FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Ayarlar updatable by authenticated"
ON ayarlar FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Ayarlar deletable by authenticated"
ON ayarlar FOR DELETE TO authenticated USING (true);

-- =====================================================
-- 11. SEED DATA - Varsayılan Bankalar (20 adet)
-- =====================================================
INSERT INTO bankalar (ad) VALUES
('Ziraat Bankası'),
('İş Bankası'),
('Garanti BBVA'),
('Yapı Kredi'),
('Akbank'),
('QNB Finansbank'),
('Denizbank'),
('Vakıfbank'),
('Halkbank'),
('TEB'),
('ING Bank'),
('HSBC'),
('Enpara'),
('Şekerbank'),
('Kuveyt Türk'),
('Türkiye Finans'),
('Albaraka Türk'),
('Ziraat Katılım'),
('Vakıf Katılım'),
('Emlak Katılım');

-- =====================================================
-- 12. SEED DATA - Varsayılan Ayarlar
-- =====================================================
INSERT INTO ayarlar (key, value) VALUES
('whatsapp_telefon', ''),
('whatsapp_mesaj', 'Sayın {cari_adi},

{evrak_tipi} bilgileri:
Evrak No: {evrak_no}
Tutar: {tutar}
Vade: {vade_tarihi}

Bilgilerinize sunarız.');

-- =====================================================
-- TAMAMLANDI!
-- =====================================================
