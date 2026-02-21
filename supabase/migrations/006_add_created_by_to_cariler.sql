-- =====================================================
-- ÇekSenet Web - Cariler tablosuna created_by sütunu ekleme
-- Tarih: 21 Şubat 2026
-- =====================================================

-- 1. CARILER tablosuna created_by sütunu ekle (eğer yoksa)
ALTER TABLE cariler 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Mevcut kayıtlara varsayılan değer ataması yapma (opsiyonel)
--    created_by sütunu boş kalabilir, eski kayıtlar için NULL bırakılır.

-- 3. (Opsiyonel) updated_at sütunu için trigger ekleme
--    Zaten updated_at sütunu var, ama otomatik güncelleme için trigger yok.
--    Aşağıdaki trigger'ı ekleyebiliriz:
/*
CREATE OR REPLACE FUNCTION update_cariler_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_on_cariler ON cariler;
CREATE TRIGGER set_updated_at_on_cariler
    BEFORE UPDATE ON cariler
    FOR EACH ROW
    EXECUTE FUNCTION update_cariler_updated_at();
*/

-- =====================================================
-- TAMAMLANDI!
-- =====================================================