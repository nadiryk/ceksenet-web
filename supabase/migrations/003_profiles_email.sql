-- =====================================================
-- ÇekSenet Web - Profiles tablosuna email alanı eklenmesi
-- Tarih: 5 Şubat 2026
-- =====================================================

-- 1. PROFILES tablosuna email sütunu ekle (eğer yoksa)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. Mevcut kayıtlara auth.users'dan email doldur
UPDATE profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS NULL;

-- 3. Trigger fonksiyonunu güncelle (yeni kullanıcılar için email otomatik ekle)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, ad_soyad, role, email)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'ad_soyad', 'Yeni Kullanıcı'),
    COALESCE(new.raw_user_meta_data->>'role', 'normal'),
    new.email
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TAMAMLANDI!
-- =====================================================