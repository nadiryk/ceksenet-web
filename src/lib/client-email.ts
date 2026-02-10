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
    const params = new URLSearchParams();
    if (subject) params.append('subject', subject);
    if (body) params.append('body', body);

    const url = `mailto:${to}?${params.toString()}`;

    // Mevcut pencerede aç (Mailto için en güvenilir yöntem)
    window.location.href = url;
}
