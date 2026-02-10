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

interface SendEmailParams {
    to: string | string[];
    subject: string;
    html: string;
    text?: string;
}

interface SendEmailResult {
    success: boolean;
    message: string;
}

/**
 * API üzerinden sunucu taraflı e-posta gönder
 */
export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
    try {
        const response = await fetch('/api/email/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(params),
        });

        const result = await response.json();

        if (!response.ok) {
            return {
                success: false,
                message: result.error || 'E-posta gönderimi başarısız'
            };
        }

        if (result.data?.simulated) {
            return {
                success: false,
                message: `Simülasyon Modu: ${result.data.message}. Lütfen Ayarlar > E-posta Ayarları kısmından SMTP bilgilerinizi giriniz.`
            };
        }

        return { success: true, message: 'E-posta başarıyla gönderildi' };
    } catch (error: any) {
        console.error('E-posta gönderme hatası:', error);
        return { success: false, message: error.message || 'Bir hata oluştu' };
    }
}
