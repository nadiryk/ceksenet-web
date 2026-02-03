# Çek/Senet Web - Claude Code Talimatları

## Proje Tanımı

Şirket içi çek ve senet takip sistemi. Çoklu para birimi, TCMB döviz kurları, vade takibi, kredi modülü, Excel import/export özellikleri var. Next.js + Supabase + Vercel stack'i kullanılıyor.

---

## Dizin Yapısı

### Dokümanlar (Obsidian - Proje Dışında)

```
F:\projects\ObsidianVault\Babam\CekSenet\
├── README.md              # Genel proje özeti
├── INDEX.md               # Doküman navigasyonu
├── DURUM.md               # Aktif task + son durum (güncellenebilir)
├── tasks/
│   ├── TASKS-README.md    # Task sistemi açıklaması
│   └── TASK-*.md          # Task dokümanları (güncellenebilir)
└── docs/
    ├── TECH-STACK.md      # Teknik mimari
    ├── DATABASE.md        # Veritabanı şeması
    ├── DESIGN.md          # UI/UX tasarım kılavuzu
    ├── FEATURES.md        # Özellik detayları
    └── TAILWIND-REFERANS.md  # Tailwind CSS v4 referans
```

### Kaynak Kod

```
F:\projects\ceksenet-web-nadiryk\   # Web versiyonu (aktif geliştirme)
F:\projects\ceksenet\               # Desktop versiyonu (arşiv - dokunma)
```

---

## Her Oturum Başında

**MUTLAKA** şu dokümanları oku:

1. `F:\projects\ObsidianVault\Babam\CekSenet\README.md`
2. `F:\projects\ObsidianVault\Babam\CekSenet\INDEX.md`
3. `F:\projects\ObsidianVault\Babam\CekSenet\docs\TECH-STACK.md`
4. `F:\projects\ObsidianVault\Babam\CekSenet\tasks\TASKS-README.md`
5. `F:\projects\ObsidianVault\Babam\CekSenet\docs\DESIGN.md`
6. `F:\projects\ObsidianVault\Babam\CekSenet\DURUM.md`

Sonra DURUM.md'deki aktif task dokümanını oku.

---

## Kod Yazma Kuralları

### Tailwind CSS v4

**KRİTİK:** Bu projede Tailwind CSS v4 kullanılıyor. v3 syntax'ı KULLANMA.

Tailwind işi yapılacaksa (HTML class, template, responsive tasarım) önce şu dokümanı oku:
`F:\projects\ObsidianVault\Babam\CekSenet\docs\TAILWIND-REFERANS.md`

Önemli farklar:
- `@import "tailwindcss"` kullan (`@tailwind base/components/utilities` değil)
- Important için sonuna `!` koy: `flex!` (`!flex` değil)
- Opacity için slash syntax: `bg-red-500/50` (`bg-opacity-50` değil)
- Container queries dahili: `@container` + `@sm:`

### Genel

- TypeScript strict mode
- React 19 + Next.js 15 (App Router)
- Supabase Auth + Database
- Catalyst UI Kit (Tailwind UI)

---

## Yasaklar

1. **Asla şu dokümanları değiştirme:**
   - README.md
   - INDEX.md
   - TASKS-README.md
   - TECH-STACK.md (güncelleme gerekirse kullanıcıya sor)
   - DESIGN.md
   - TAILWIND-REFERANS.md

2. **Desktop versiyonuna dokunma:**
   - `F:\projects\ceksenet\` klasörü arşiv, müdahale etme

3. **Güncelleme yapılabilecek dokümanlar:**
   - DURUM.md (her oturum sonunda)
   - Aktif task dokümanları (ilerleme, sorunlar, kararlar)

---

## Genel Davranış Kuralları

1. **Acele etme.** Düşün, analiz et, sonra öneride bulun. Sırf öneri vermek için öneri verme - uygulandığında yaratacağı durumu hesapla.

2. **Halüsinasyon yapma.** Emin olmadığın şeyleri söyleme/yazma. Soru sor. Eksik bilgi, yanlış bilgiden iyidir.

3. **Varsayımları sorgula.** Kullanıcının her şeyi doğru yaptığını varsayma. Sistemi ilk defa kuruyormuş gibi düşün - dış hesaplar (API, üyelik vb.) dahil kontrol edilmesi gerekenleri sor.

4. **Bilgi havuzunu güncel tut.** Elde edilen bilgileri düzenli şekilde kaydet. Doğru ve güncel dokümantasyon kritik.

5. **Kritik sorunlarda sor.** Belirsizlik varsa, kararı kullanıcıya bırak.

---

## Oturum Sonu Protokolü

Her oturum sonunda:

1. **DURUM.md'yi güncelle:**
   - Son oturum özeti (3-4 cümle)
   - Aktif task pointer
   - Varsa yeni sorunlar/kararlar

2. **Aktif task dokümanını güncelle:**
   - Yapılanlar
   - Sorunlar ve çözümler
   - Sonraki hedef

---

*Bu doküman statiktir. Dinamik bilgiler (aktif task, son durum, ilerleme) için DURUM.md'ye bak.*
