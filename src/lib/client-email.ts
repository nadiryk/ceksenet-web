/**
 * Varsayılan e-posta istemcisini aç (VB6/Shell mantığı)
 * Bu fonksiyon sadece istemci tarafında (browser) çalışır.
 */
export function openEmailClient(to: string, subject: string, body: string): void {
    if (typeof window === 'undefined') return;

    if (!to) {
        console.warn('E-posta adresi belirtilmedi');
        return;
    }

    // Mailto linki oluştur
    // URLSearchParams boşlukları '+' olarak kodlar, Outlook bunu sevmeyebilir.
    // Bu yüzden encodeURIComponent kullanarak manuel oluşturuyoruz.

    const subjectEncoded = encodeURIComponent(subject).replace(/\+/g, '%20');
    const bodyEncoded = encodeURIComponent(body).replace(/\+/g, '%20');

    // Outlook için satır sonları %0D%0A olmalı
    const bodyFinal = bodyEncoded.replace(/%0A/g, '%0D%0A');

    const url = `mailto:${to}?subject=${subjectEncoded}&body=${bodyFinal}`;

    try {
        // Mevcut pencerede aç
        window.location.href = url;
    } catch (e) {
        console.error('Mailto linki açılırken hata:', e);
    }
}
