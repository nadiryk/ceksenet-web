# ÇekSenet Web Kullanım Kılavuzu

## 1. Giriş

### 1.1 Sistem Hakkında
ÇekSenet Web, çek ve senetlerin dijital olarak kaydedilmesini, takibini ve yönetimini sağlayan bir web uygulamasıdır. Sistem sayesinde:
- Çek ve senet bilgilerini merkezi bir veritabanında saklayabilir,
- Vade takibi yapabilir,
- Durum değişikliklerini (portföy, bankada, ciro, tahsil, karşılıksız) izleyebilir,
- Cariler (müşteri/tedarikçi) ile ilişkilendirebilir,
- Otomatik bildirimler (WhatsApp, Telegram, E‑posta) gönderebilir,
- Kredi taksitlerini yönetebilir,
- Raporlar alabilirsiniz.

### 1.2 Temel Terimler
| Terim | Açıklama |
|-------|----------|
| **Çek** | Bir bankaya hitaben yazılan, belirli bir tutarın ödenmesi için verilen ödeme aracı. |
| **Senet** | Alacaklı ile borçlu arasında düzenlenen, belirli bir vadesi ve tutarı olan ticari belge. |
| **Portföy** | Henüz bankaya verilmemiş veya işleme alınmamış evrak durumu. |
| **Bankada** | Evrakın bankaya teslim edilmiş durumu. |
| **Ciro** | Evrakın başka bir kişiye devredilmiş durumu. |
| **Tahsil** | Evrakın bedelinin tahsil edilmiş durumu. |
| **Karşılıksız** | Evrakın ödenmemiş (protestolu) durumu. |
| **Cari** | Müşteri veya tedarikçi firma/kişi. |
| **Keşideci** | Çek veya senedi düzenleyen kişi/firma. |
| **Vade** | Evrakın ödeme tarihi. |

### 1.3 Sistem Gereksinimleri
- **İnternet tarayıcısı**: Chrome, Firefox, Edge, Safari (güncel sürüm)
- **İnternet bağlantısı**: Sürekli bağlantı önerilir
- **Ekran çözünürlüğü**: 1024×768 ve üzeri
- **Tarayıcı ayarları**: JavaScript ve çerezler etkin olmalı

---

## 2. Sisteme Erişim ve Hesap Yönetimi

### 2.1 Giriş Yapma (Login)
1. Tarayıcınızda sistem adresini açın (örn: `https://ceksenet.example.com`).
2. Açılan giriş sayfasında **E‑posta** ve **Şifre** alanlarını doldurun.
3. **Giriş Yap** butonuna tıklayın.
4. Eğer bilgileriniz doğruysa dashboard (ana sayfa) yüklenecektir.

**Not**: İlk defa giriş yapıyorsanız sistem yöneticinizden hesap bilgilerinizi almalısınız.

### 2.2 Şifremi Unuttum
1. Giriş sayfasında **“Şifremi unuttum”** bağlantısına tıklayın.
2. Açılan forma kayıtlı e‑posta adresinizi yazın.
3. **Şifre Sıfırlama Bağlantısı Gönder** butonuna tıklayın.
4. E‑postanıza gelen bağlantı ile yeni şifrenizi belirleyin.

### 2.3 Profil Bilgilerini Görüntüleme ve Düzenleme
1. Sağ üst köşedeki kullanıcı avatarına (veya adınıza) tıklayın.
2. Açılan menüden **“Profilim”** seçeneğini seçin.
3. **Ad Soyad**, **Kullanıcı Adı** gibi bilgilerinizi görüntüleyebilir ve güncelleyebilirsiniz.
4. Değişiklikleri kaydetmek için **“Güncelle”** butonuna basın.

### 2.4 Şifre Değiştirme
1. **Profilim** sayfasında **“Şifre Değiştir”** sekmesine geçin.
2. **Mevcut Şifre**, **Yeni Şifre**, **Yeni Şifre (Tekrar)** alanlarını doldurun.
3. **“Şifreyi Güncelle”** butonuna tıklayın.
4. Başarılı bir değişiklikte otomatik olarak tekrar giriş yapmanız istenebilir.

### 2.5 Çıkış Yapma (Logout)
- Sağ üst köşedeki kullanıcı menüsünden **“Çıkış Yap”** seçeneğini tıklayın.
- Sistem sizi giriş sayfasına yönlendirecektir.

---

## 3. Dashboard (Ana Sayfa)

Dashboard, sistemdeki genel durumu özetleyen grafikler, istatistikler ve son işlemlerin yer aldığı ana sayfadır.

### 3.1 Bileşenler
- **İstatistik Kartları**: Toplam evrak sayısı, toplam tutar, portföydeki evrak sayısı, vadesi yaklaşan/geçen evrak sayısı.
- **Durum Dağılımı Pasta Grafiği**: Evrakların durumlara göre dağılımı.
- **Tip Dağılımı Grafiği**: Çek ve senet sayılarının karşılaştırması.
- **Son Eklenen Evraklar**: En son kaydedilen 10 evrak listesi.
- **Yaklaşan Vadeler**: Önümüzdeki 7 gün içinde vadesi gelecek evraklar.
- **Kredi Özeti**: Aktif kredi sayısı, toplam borç, bu ayki taksit tutarı, geciken taksit bilgisi.

### 3.2 Veri Yenileme
- Dashboard verileri otomatik olarak 5 dakikada bir yenilenir.
- Manuel yenileme için sayfanın sağ üstündeki **“Yenile”** butonuna (↻) tıklayın.

### 3.3 Hızlı Erişim
- İstatistik kartlarının altındaki **“Tümünü Görüntüle”** bağlantıları ilgili modüllere (Evraklar, Cariler, Krediler) yönlendirir.

---

## 4. Evraklar Modülü

Evraklar modülü çek ve senetlerin kaydedilmesi, listelenmesi, düzenlenmesi ve durum takibinin yapıldığı ana modüldür.

### 4.1 Evrak Listesi
**Erişim**: Sol menüden **“Evraklar”** seçeneğine tıklayın.

- **Filtreleme**:  
  - Durum (Portföy, Bankada, Ciro, Tahsil, Karşılıksız)  
  - Evrak Tipi (Çek, Senet)  
  - Vade Tarihi (Bugün, Bu Hafta, Bu Ay, Geçmiş)  
  - Cari ve Banka seçimi  
- **Arama**: Evrak No, Keşideci alanlarına yazarak anında filtreleme yapabilirsiniz.
- **Sıralama**: Herhangi bir sütun başlığına tıklayarak artan/azalan sıralama yapılabilir.
- **Toplu İşlemler**: Birden fazla evrak seçerek durumlarını topluca değiştirebilirsiniz.

### 4.2 Yeni Evrak Ekleme
1. Evrak listesi sayfasında **“+ Yeni Evrak”** butonuna tıklayın.
2. Açılan formda aşağıdaki bilgileri doldurun:

| Alan | Açıklama | Zorunlu |
|------|----------|---------|
| **Evrak Tipi** | Çek veya Senet | Evet |
| **Evrak No** | Evrakın seri/numara bilgisi | Evet |
| **Tutar** | Evrak tutarı (ondalık ayracı nokta) | Evet |
| **Para Birimi** | TRY, USD, EUR, GBP | Evet |
| **Döviz Kuru** | Para birimi TRY değilse, kur değeri girilir (otomatik dolabilir) | Hayır |
| **Evrak Tarihi** | Evrakın düzenlenme tarihi | Hayır |
| **Vade Tarihi** | Evrakın vade tarihi | Evet |
| **Banka** | Banka seçimi (önceden tanımlı bankalar listesinden) | Hayır |
| **Keşideci** | Çeki/senedi düzenleyen kişi/firma adı | Evet |
| **Cari** | İlişkili cari (müşteri/tedarikçi) seçimi | Hayır |
| **Durum** | Başlangıç durumu (varsayılan: Portföy) | Evet |
| **Notlar** | Ek açıklamalar | Hayır |

3. **Fotoğraf Ekleme**: Formun altındaki **“Fotoğraf Yükle”** alanından evrakın görselini yükleyebilirsiniz (birden fazla fotoğraf eklenebilir).
4. **Kaydet**: Tüm bilgileri girdikten sonra **“Kaydet”** butonuna basın. Evrak listeye eklenecektir.

### 4.3 Evrak Detayı ve Düzenleme
1. Evrak listesinde ilgili satırdaki **“Detay”** butonuna tıklayın.
2. Açılan sayfada evrakın tüm bilgileri, durum geçmişi ve fotoğrafları görüntülenir.
3. **“Düzenle”** butonuna tıklayarak bilgileri güncelleyebilirsiniz.
4. Değişiklikleri kaydettikten sonra sayfa yenilenecektir.

**Not**: Evrak silmek için detay sayfasındaki **“Sil”** butonunu kullanın. Silme işlemi yalnızca yetkili kullanıcılar tarafından yapılabilir.

### 4.4 Evrak Durum İşlemleri
Evrakın durumunu değiştirmek için:
1. Evrak detay sayfasında **“Durum Değiştir”** butonuna tıklayın.
2. Açılan pencereden yeni durumu seçin (Portföy → Bankada, Bankada → Ciro, vb.).
3. İsteğe bağlı olarak bir **açıklama** girin.
4. **“Onayla”** butonuna basın.

**Otomatik Bildirim**: Durum değişikliği kaydedildiğinde, eğer WhatsApp veya Telegram entegrasyonu aktifse ilgili cariye bildirim gönderilir.

### 4.5 Evrak Fotoğrafları
- Evrak detay sayfasında **“Fotoğraflar”** sekmesi altında yüklenen fotoğraflar galeri şeklinde görüntülenir.
- Fotoğraf eklemek için **“Yeni Fotoğraf Yükle”** butonunu kullanın.
- Mevcut fotoğrafları silmek için fotoğrafın üzerindeki çöp kutusu simgesine tıklayın.

---

## 5. Cariler Modülü

Cariler (müşteri/tedarikçi) bilgilerinin saklandığı ve evraklarla ilişkilendirildiği modüldür.

### 5.1 Cari Listesi
**Erişim**: Sol menüden **“Cariler”** seçeneğine tıklayın.

- **Filtreleme**: Tip (Müşteri, Tedarikçi) ve arama kutusu ile filtreleme yapılabilir.
- **Liste**: Her cari için ad‑soyad, tip, telefon, e‑posta ve o cariye ait evrak sayısı görüntülenir.

### 5.2 Yeni Cari Ekleme
1. Cari listesi sayfasında **“+ Yeni Cari”** butonuna tıklayın.
2. Formda aşağıdaki bilgileri doldurun:

| Alan | Açıklama | Zorunlu |
|------|----------|---------|
| **Ad Soyad** | Cari adı/soyadı veya firma ünvanı | Evet |
| **Tip** | Müşteri veya Tedarikçi | Evet |
| **Telefon** | İletişim telefonu | Hayır |
| **E‑posta** | E‑posta adresi | Hayır |
| **Adres** | Fiziksel adres | Hayır |
| **Vergi No** | Vergi kimlik numarası | Hayır |
| **Notlar** | Ek açıklamalar | Hayır |

3. **“Kaydet”** butonuna basın.

### 5.3 Cari Detay ve Düzenleme
1. Cari listesinde ilgili satırdaki **“Detay”** butonuna tıklayın.
2. Açılan sayfada cari bilgileri ve **“Bu Cariye Ait Evraklar”** listesi görüntülenir.
3. **“Düzenle”** butonuna tıklayarak bilgileri güncelleyebilirsiniz.
4. Değişiklikleri kaydedin.

**Not**: Cari silmek için detay sayfasındaki **“Sil”** butonunu kullanın. Silme işlemi yalnızca yetkili kullanıcılar tarafından yapılabilir.

---

## 6. Krediler Modülü

Krediler modülü bankalardan alınan kredilerin ve taksit planlarının takip edildiği bölümdür.

### 6.1 Kredi Listesi
**Erişim**: Sol menüden **“Krediler”** seçeneğine tıklayın.

- **Liste**: Her kredi için banka adı, tutar, vade, kalan borç, durum (Aktif/Kapalı) bilgileri görüntülenir.
- **Filtreleme**: Duruma (Aktif/Kapalı) ve bankaya göre filtreleme yapılabilir.

### 6.2 Yeni Kredi Ekleme
1. Kredi listesi sayfasında **“+ Yeni Kredi”** butonuna tıklayın.
2. Formda aşağıdaki bilgileri doldurun:

| Alan | Açıklama | Zorunlu |
|------|----------|---------|
| **Banka** | Banka seçimi (önceden tanımlı bankalar listesinden) | Evet |
| **Kredi Tutarı** | Kredi ana parası | Evet |
| **Para Birimi** | TRY, USD, EUR, GBP | Evet |
| **Vade Tarihi** | Kredinin son ödeme tarihi | Evet |
| **Faiz Oranı** | Yıllık faiz oranı (%) | Hayır |
| **Açıklama** | Kredi ile ilgili notlar | Hayır |

3. **“Kaydet”** butonuna basın. Sistem otomatik olarak aylık taksit planı oluşturacaktır.

### 6.3 Kredi Detayı
1. Kredi listesinde ilgili satırdaki **“Detay”** butonuna tıklayın.
2. Açılan sayfada:
   - Kredi genel bilgileri
   - **Taksitler Tablosu**: Her taksitin tarihi, tutarı, durumu (Ödendi/Bekliyor/Gecikmiş)
   - **Erken Ödeme** seçeneği
   - **Taksit Ödeme** ve **Taksit İptal** butonları

### 6.4 Taksit İşlemleri
- **Taksit Ödeme**: Taksit satırındaki **“Öde”** butonuna tıklayarak taksitin ödendiğini işaretleyin.
- **Taksit İptal**: Yanlışlıkla oluşturulmuş bir taksiti **“İptal Et”** butonu ile iptal edebilirsiniz (yalnızca henüz ödenmemiş taksitler).
- **Erken Ödeme**: Kredi detay sayfasındaki **“Erken Ödeme Yap”** butonu ile kredinin tamamını veya bir kısmını erken kapatabilirsiniz.

### 6.5 Yaklaşan ve Geciken Taksitler
- Dashboard’da **“Yaklaşan Taksitler”** ve **“Geciken Taksitler”** kartları bulunur.
- Bu kartlardaki **“Tümünü Görüntüle”** bağlantısı ilgili taksitlerin filtrelenmiş listesine yönlendirir.

---

## 7. Raporlar Modülü

Raporlar modülü sistemdeki verileri özetleyen Excel raporlarının alınabileceği bölümdür.

### 7.1 Excel Raporları
**Erişim**: Sol menüden **“Raporlar”** seçeneğine tıklayın.

- **Evrak Özeti Raporu**: Seçilen tarih aralığındaki tüm evrakların listesi (durum, tutar, vade, cari bilgileri).
- **Cari Bazlı Rapor**: Belirli bir cariye ait evrakların dökümü.
- **Durum Dağılım Raporu**: Durumlara göre evrak sayısı ve tutar toplamları.

**Rapor Alma Adımları**:
1. İstenen rapor türünü seçin.
2. Tarih aralığı, durum, cari gibi filtreleri belirleyin.
3. **“Rapor Oluştur”** butonuna tıklayın.
4. Sistem raporu Excel (.xlsx) formatında oluşturacak ve indirme bağlantısı sunacaktır.

### 7.2 Dashboard Grafikleri
Dashboard’da yer alan **Durum Dağılımı** ve **Tip Dağılımı** grafikleri aynı zamanda görsel rapor niteliğindedir. Bu grafiklerin üzerine tıklayarak ilgili evrak listesine ulaşabilirsiniz.

---

## 8. Ayarlar

Ayarlar modülü kullanıcı profilinden sistem entegrasyonlarına kadar çeşitli yapılandırmaların yapıldığı bölümdür.

**Erişim**: Sol menüden **“Ayarlar”** seçeneğine tıklayın. Ayarlar sayfasında sekme şeklinde aşağıdaki bölümler bulunur:

### 8.1 Profil Ayarları
- **Ad Soyad**, **Kullanıcı Adı** gibi kişisel bilgilerin güncellenmesi.
- Değişiklikleri kaydetmek için **“Güncelle”** butonu.

### 8.2 Şifre Değiştirme
- Mevcut şifre, yeni şifre ve yeni şifre tekrarı alanları.
- **“Şifreyi Güncelle”** butonu.

### 8.3 WhatsApp Ayarları
- **Telefon Numarası**: Bildirim gönderilecek WhatsApp numarası (ülke kodu ile birlikte, örn: +905551234567).
- **Mesaj Şablonu**: Bildirimlerde kullanılacak metin şablonu. Aşağıdaki değişkenleri kullanabilirsiniz:

| Değişken | Açıklama |
|----------|----------|
| `{evrak_no}` | Evrak numarası |
| `{tutar}` | Tutar |
| `{para_birimi}` | Para birimi (TRY, USD, vb.) |
| `{vade_tarihi}` | Vade tarihi (gg.aa.yyyy) |
| `{evrak_tipi}` | Çek veya Senet |
| `{kesideci}` | Keşideci adı |
| `{cari}` | Cari adı |
| `{banka}` | Banka adı |

- **Test Mesajı Gönder**: Ayarları kaydettikten sonra **“Test Mesajı Gönder”** butonu ile deneme bildirimi yapabilirsiniz.

### 8.4 Telegram Ayarları
- **Bot Token**: Telegram Bot Father’dan aldığınız bot token’ı.
- **Chat ID**: Bildirimlerin gönderileceği grup veya kanal chat ID’si.
- **Bildirimleri Aktif Et**: Telegram bildirimlerini aç/kapa.
- **Test Mesajı Gönder**: Ayarları test etmek için kullanılır.

### 8.5 Email Rapor Ayarları
- **Alıcı E‑posta Adresleri**: Günlük raporun gönderileceği e‑posta adresleri (virgülle ayırarak birden fazla girebilirsiniz).
- **Rapor Saati**: Raporun her gün hangi saatte (UTC+3) gönderileceği.
- **Test Raporu Gönder**: **“Şimdi Gönder”** butonu ile anlık bir test raporu e‑postası alabilirsiniz.

### 8.6 Döviz Kuru Ayarları
- **Otomatik Güncelleme**: TCMB’den döviz kurlarının otomatik çekilmesini aç/kapa.
- **Manuel Kur Girişi**: Otomatik güncelleme kapalıysa, USD, EUR, GBP, CHF için manuel kur değerleri girebilirsiniz.
- **Son Güncelleme**: Son kur güncelleme tarih/saati.

### 8.7 Kullanıcı Yönetimi (Yalnızca Admin)
- **Kullanıcı Listesi**: Tüm kullanıcıların ad‑soyad, e‑posta, rol (admin/normal) ve son giriş tarihi.
- **Yeni Kullanıcı Ekle**: E‑posta, ad‑soyad, rol bilgileri ile yeni kullanıcı oluşturma.
- **Rol Değiştirme**: Mevcut kullanıcının rolünü admin/normal yapma.
- **Şifre Sıfırlama**: Kullanıcının şifresini varsayılana sıfırlama (kullanıcı ilk girişte kendi şifresini belirler).

---

## 9. Entegrasyonlar

### 9.1 WhatsApp Bildirimleri
- **Ne zaman çalışır?**: Evrak durumu değiştiğinde (örneğin Portföy → Bankada) ilgili cariye ait telefona WhatsApp mesajı gönderilir.
- **Mesaj içeriği**: WhatsApp ayarlarında tanımlanan şablona göre oluşturulur.
- **Test**: Ayarlar sayfasındaki **“Test Mesajı Gönder”** butonu ile el ile de mesaj gönderebilirsiniz.

### 9.2 Telegram Bildirimleri
- **Ne zaman çalışır?**: Evrak durumu değişiklikleri ve günlük özet bildirimleri (saat 09:00’da) tanımlı chat ID’ye gönderilir.
- **Günlük özet**: Toplam evrak sayısı, vadesi yaklaşan/geçen evrak sayısı, geciken taksit bilgisi.

### 9.3 Email Raporları
- **Günlük rapor**: Her gün belirlenen saatte (varsayılan 08:00) dashboard özetini içeren bir e‑posta gönderilir.
- **Rapor içeriği**: Toplam evrak, toplam tutar, portföydeki evrak sayısı, vadesi yaklaşan/geçen evraklar listesi, geciken taksitler.

### 9.4 Döviz Kuru Entegrasyonu
- **Otomatik güncelleme**: Aktifse, her gün saat 09:00’da TCMB’den güncel kurlar çekilir ve `kurlar` tablosuna kaydedilir.
- **Evrak tutarlarına etkisi**: Döviz cinsinden evrakların TRY karşılığı hesaplanırken bu kurlar kullanılır.

---

## 10. Otomatik İşlemler (Cron)

Sistem arka planda aşağıdaki otomatik işlemleri gerçekleştirir:

- **Günlük email raporu**: Cron job her gün belirlenen saatte tetiklenir.
- **Vadesi yaklaşan evrak bildirimleri**: Her sabah 09:00’da vadesi 3 gün içinde olan evraklar için cariye WhatsApp/Telegram bildirimi gönderilir.
- **Geciken taksit hatırlatmaları**: Her pazartesi saat 10:00’da geciken taksitler için ilgili kullanıcıya e‑posta gönderilir.
- **Sistem keep‑alive**: Uygulamanın uyku moduna geçmesini engellemek için 15 dakikada bir `/api/cron/keep‑alive` endpoint’ine istek atılır.

---

## 11. Sıkça Sorulan Sorular (SSS)

### 11.1 Nasıl şifre değiştirilir?
Ayarlar → Şifre Değiştir sekmesinden mevcut şifrenizi girerek yeni şifrenizi belirleyebilirsiniz.

### 11.2 Evrak nasıl eklenir?
Evraklar modülünde **“+ Yeni Evrak”** butonuna tıklayın ve formu doldurun.

### 11.3 WhatsApp bildirimi neden gelmiyor?
- WhatsApp ayarlarında telefon numarası doğru formatta (+90…) girilmiş mi?
- Mesaj şablonunda geçersiz değişken var mı?
- Cariye ait telefon numarası sistemde kayıtlı mı?
- WhatsApp servisi geçici olarak kesinti yaşıyor olabilir.

### 11.4 Döviz kuru nasıl güncellenir?
Ayarlar → Döviz Kuru sekmesinde **“Otomatik Güncelleme”** aktif ise sistem her gün otomatik günceller. Manuel güncelleme için **“Şimdi Güncelle”** butonunu kullanın.

### 11.5 Admin yetkileri nelerdir?
- Yeni kullanıcı ekleme/silme
- Kullanıcı rollerini değiştirme
- Tüm evrakları görüntüleme/düzenleme/silme
- Tüm carileri ve kredileri yönetme
- Sistem ayarlarını değiştirme

---

## 12. Sorun Giderme

### 12.1 Giriş yapamıyorum
- E‑posta ve şifrenizin doğru olduğundan emin olun.
- **“Şifremi unuttum”** bağlantısı ile şifrenizi sıfırlayın.
- Hesabınızın aktif olduğundan emin olun (sistem yöneticinize danışın).

### 12.2 Veriler yüklenmiyor
- İnternet bağlantınızı kontrol edin.
- Tarayıcınızın önbelleğini temizleyip sayfayı yenileyin.
- Sorun devam ederse sistem yöneticinize bildirin.

### 12.3 Bildirimler çalışmıyor
- Ayarlar sayfasında ilgili entegrasyonun (WhatsApp/Telegram) aktif olduğunu kontrol edin.
- Test mesajı göndererek entegrasyonun çalışıp çalışmadığını kontrol edin.
- Log kayıtlarını inceleyin (sistem yöneticisi).

### 12.4 Excel raporu indirilemiyor
- Rapor oluşturulurken filtrelerin çok geniş olmamasına dikkat edin (çok fazla veri indirme süresini uzatır).
- Tarayıcınızın pop‑up engelleyicisini kapatın.
- Farklı bir tarayıcı deneyin.

### 12.5 Destek iletişim bilgileri
Teknik sorunlar veya öneriler için sistem yöneticinizle iletişime geçin.  
**E‑posta**: nadiryalcinkaya@gmail.com    
**Telefon**: +90 542 617 19 51 

## Ekler

### A. Klavye Kısayolları
- `Ctrl + K`: Global arama (geliştirme aşamasında)
- `Ctrl + S`: Bulunduğunuz formu kaydetme
- `Esc`: Açık modal/diyalog kapatma

### B. Terimler Sözlüğü
Terimlerin detaylı açıklamaları için **1.2 Temel Terimler** bölümüne bakınız.

### C. Ekran Görüntüleri
Kılavuzun görsel destekli versiyonu ilerleyen günlerde güncellenecektir.

---

*Son güncelleme: 21 Şubat 2026*  
*Doküman versiyonu: 1.0*