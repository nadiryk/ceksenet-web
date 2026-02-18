-- =====================================================
-- Döviz Kurları Tablosu
-- TCMB'den çekilen günlük döviz kurlarını saklar
-- =====================================================

CREATE TABLE doviz_kurlari (
    tarih DATE PRIMARY KEY,
    usd NUMERIC(10, 4),
    eur NUMERIC(10, 4),
    gbp NUMERIC(10, 4),
    chf NUMERIC(10, 4),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS (Row Level Security)
ALTER TABLE doviz_kurlari ENABLE ROW LEVEL SECURITY;

-- Authenticated kullanıcılar tüm işlemleri yapabilir (basit uygulama)
CREATE POLICY "Doviz kurlari readable by authenticated"
ON doviz_kurlari FOR SELECT TO authenticated USING (true);

CREATE POLICY "Doviz kurlari insertable by authenticated"
ON doviz_kurlari FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Doviz kurlari updatable by authenticated"
ON doviz_kurlari FOR UPDATE TO authenticated USING (true);

-- Index
CREATE INDEX idx_doviz_kurlari_tarih ON doviz_kurlari(tarih DESC);