# ÇekSenet Web Kullanım Kılavuzu Planı

## Kılavuz Hakkında
- **Hedef Kitle**: Son kullanıcılar (çalışanlar, yöneticiler)
- **Dil**: Türkçe
- **Format**: Markdown (daha sonra PDF'ye dönüştürülebilir)
- **Kapsam**: Tüm sistem modülleri ve işlevleri

## Sistem Genel Bakış
ÇekSenet Web, çek ve senetlerin dijital olarak takip edilmesini sağlayan bir web uygulamasıdır. Başlıca özellikleri:
- Çek/Senet kaydı ve durum takibi
- Cari (müşteri/tedarikçi) yönetimi
- Kredi takip modülü
- Otomatik raporlar ve dashboard
- WhatsApp/Telegram bildirim entegrasyonu
- Döviz kuru takibi
- Çok kullanıcılı yetkilendirme (admin/normal)

## Kılavuz Bölümleri (Detaylı Plan)

### 1. Giriş
- Sistemin amacı ve kapsamı
- Temel terminoloji (çek, senet, portföy, vade, ciro vb.)
- Sistem gereksinimleri (tarayıcı, internet bağlantısı)

### 2. Sisteme Erişim ve Hesap Yönetimi
- Giriş yapma (login)
- Şifremi unuttum işlemi
- Profil bilgilerini görüntüleme ve düzenleme
- Şifre değiştirme
- Çıkış yapma (logout)

### 3. Dashboard (Ana Sayfa)
- Dashboard'un bileşenleri (istatistik kartları, grafikler, tablolar)
- Veri yenileme
- Son güncelleme bilgisi
- Dashboard'dan hızlı erişim linkleri

### 4. Evraklar Modülü
#### 4.1 Evrak Listesi
- Filtreleme (durum, tip, vade tarihi)
- Arama (evrak no, keşideci)
- Sıralama
- Toplu işlemler (durum güncelleme)

#### 4.2 Yeni Evrak Ekleme
- Çek veya senet seçimi
- Zorunlu alanlar (evrak no, tutar, vade tarihi)
- Para birimi ve döviz kuru
- Banka ve cari seçimi
- Durum belirleme
- Fotoğraf ekleme

#### 4.3 Evrak Detayı ve Düzenleme
- Evrak bilgilerini görüntüleme
- Durum geçmişi
- Fotoğraflar galerisi
- Evrak bilgilerini güncelleme
- Evrak silme (yetkiye bağlı)

#### 4.4 Evrak Durum İşlemleri
- Portföy, bankada, ciro, tahsil, karşılıksız durumları
- Durum değiştirme adımları
- Otomatik bildirimler (WhatsApp/Telegram)

### 5. Cariler Modülü
#### 5.1 Cari Listesi
- Müşteri/tedarikçi ayrımı
- Arama ve filtreleme

#### 5.2 Yeni Cari Ekleme
- Temel bilgiler (ad-soyad, tip, iletişim)
- Vergi no, adres, notlar

#### 5.3 Cari Detay ve Düzenleme
- Cariye ait evraklar listesi
- İletişim bilgilerini güncelleme

### 6. Krediler Modülü
#### 6.1 Kredi Listesi
- Aktif/kapanmış krediler
- Borç özeti

#### 6.2 Yeni Kredi Ekleme
- Banka, tutar, vade, faiz oranı
- Taksit planı oluşturma

#### 6.3 Kredi Detayı
- Taksitler tablosu
- Erken ödeme yapma
- Taksit ödeme işlemi
- Taksit iptali

#### 6.4 Yaklaşan ve Geciken Taksitler
- Dashboard bağlantısı
- Bildirimler

### 7. Raporlar Modülü
#### 7.1 Excel Raporları
- Evrak özeti raporu
- Cari bazlı rapor
- Durum dağılım raporu
- Raporları indirme

#### 7.2 Dashboard Grafikleri
- Durum dağılım pasta grafiği
- Tip dağılım grafiği

### 8. Ayarlar
#### 8.1 Profil Ayarları
- Ad soyad, kullanıcı adı güncelleme

#### 8.2 Şifre Değiştirme
- Mevcut şifre, yeni şifre, onay

#### 8.3 WhatsApp Ayarları
- Telefon numarası kaydetme
- Özel mesaj şablonu oluşturma
- Değişkenler kullanma (örn: {evrak_no}, {tutar})
- Test mesajı gönderme

#### 8.4 Telegram Ayarları
- Bot token ve chat ID girme
- Bildirimleri aktifleştirme
- Test mesajı gönderme

#### 8.5 Email Rapor Ayarları
- Günlük rapor alıcılarını belirleme
- Rapor saatini ayarlama

#### 8.6 Döviz Kuru Ayarları
- Otomatik güncelleme aktif/pasif
- Manuel kur girişi

#### 8.7 Kullanıcı Yönetimi (Admin)
- Yeni kullanıcı ekleme
- Kullanıcı listesi ve rol değiştirme
- Şifre sıfırlama

### 9. Entegrasyonlar
#### 9.1 WhatsApp Bildirimleri
- Evrak durum değişikliğinde otomatik mesaj
- Manuel mesaj gönderme

#### 9.2 Telegram Bildirimleri
- Durum değişikliği bildirimleri
- Günlük özet bildirimi

#### 9.3 Email Raporları
- Günlük özet email içeriği
- Rapor özelleştirme

#### 9.4 Döviz Kuru Entegrasyonu
- TCMB'den otomatik kur çekme
- Evrak tutarlarına kur etkisi

### 10. Otomatik İşlemler
- Günlük email raporu (cron)
- Vadesi yaklaşan evrak bildirimleri
- Geciken taksit hatırlatmaları
- Sistem keep-alive ping

### 11. Sıkça Sorulan Sorular (SSS)
- Nasıl şifre değiştirilir?
- Evrak nasıl eklenir?
- WhatsApp bildirimi neden gelmiyor?
- Döviz kuru nasıl güncellenir?
- Admin yetkileri nelerdir?

### 12. Sorun Giderme
- Giriş yapamıyorum
- Veriler yüklenmiyor
- Bildirimler çalışmıyor
- Excel raporu indirilemiyor
- Destek iletişim bilgileri

## Ekler
- Ekran görüntüleri (ileride eklenecek)
- Terimler sözlüğü
- Klavye kısayolları (varsa)

## Sonraki Adımlar
1. Kullanıcıdan bu planı onaylamasını isteme
2. Her bölüm için detaylı içerik yazma
3. İçeriği markdown formatında düzenleme
4. Kılavuzu gözden geçirme ve düzeltmeler
5. Nihai kılavuzu teslim etme

---
*Plan tarihi: 21 Şubat 2026*