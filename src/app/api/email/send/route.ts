import { NextRequest } from 'next/server';
import nodemailer from 'nodemailer';
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
} from '@/lib/api/response';

/**
 * POST /api/email/send
 * SMTP ile e-posta gönder
 * 
 * Body:
 * - to: string | string[]
 * - subject: string
 * - html: string
 * - text?: string
 */
// ... other imports
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/email/send
 * SMTP ile e-posta gönder
 * 
 * Body:
 * - to: string | string[]
 * - subject: string
 * - html: string
 * - text?: string
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, subject, html, text, attachments } = body;

    // attachments: { filename: string, content: string (base64) | buffer, contentType?: string }[]

    if (!subject || !html) {
      return errorResponse('subject ve html alanları zorunludur');
    }

    // Supabase'den ayarları çek
    const supabase = await createClient();
    const { data: settingsData } = await supabase
      .from('ayarlar')
      .select('key, value')
      .in('key', ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_password', 'smtp_secure', 'email_from', 'email_from_name', 'email_admin']);

    // Ayarları objeye çevir
    const settings: Record<string, string> = {};
    settingsData?.forEach(row => {
      if (row.value) settings[row.key] = row.value;
    });

    // SMTP yapılandırması (DB öncelikli, yoksa ENV)
    const smtpHost = settings.smtp_host || process.env.SMTP_HOST || 'smtp.gmail.com';
    let smtpPort = parseInt(settings.smtp_port || process.env.SMTP_PORT || '465', 10);
    const smtpUser = settings.smtp_user || process.env.SMTP_USER;
    const smtpPassword = settings.smtp_password || process.env.SMTP_PASSWORD;

    // VB6/CDO mantığı: Gmail için zorla 465 ve SSL kullan
    const isGmail = smtpHost.includes('gmail');
    if (isGmail) {
      smtpPort = 465;
    }

    const smtpSecure = isGmail ? true : (settings.smtp_secure === 'true' || (process.env.SMTP_SECURE === 'true'));

    // Gönderen bilgisi
    const smtpFrom = settings.email_from || process.env.EMAIL_FROM || smtpUser || 'noreply@ceksenet.com';
    const smtpFromName = settings.email_from_name || process.env.EMAIL_FROM_NAME || 'ÇekSenet Web';

    // Eğer SMTP bilgileri yoksa hata döndür (Simülasyon kafa karıştırıyor)
    if (!smtpUser || !smtpPassword) {
      return errorResponse('SMTP kullanıcı adı veya şifresi girilmemiş. Lütfen Ayarlar sayfasından yapılandırın.');
    }

    // Nodemailer transporter oluştur
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure, // 465 -> true
      auth: {
        user: smtpUser,
        pass: smtpPassword,
      },
      tls: {
        // VB6'da SSL true denilmiş, burada da zorlayalım
        rejectUnauthorized: false
      }
    });

    // ADMIN ROUTING LOGIC
    // E-postayı her zaman yöneticiye gönder, müşteriye gitmesin.
    const adminEmail = settings.email_admin;
    let finalTo = to;
    let finalSubject = subject;
    let finalHtml = html;
    let finalText = text;

    // Eğer 'to' boş ise ve yönetici e-postası varsa, yöneticiye gönder.
    // Eğer 'to' dolu ise ve yönetici e-postası varsa, yine yöneticiye gönder (disclaimer ile).

    if (adminEmail) {
      // Orijinal alıcıyı gövdeye ekle
      const originalTo = to ? (Array.isArray(to) ? to.join(', ') : to) : '(Alıcı Belirtilmemiş)';

      const disclaimerHtml = `
        <div style="background-color: #fff3cd; color: #856404; padding: 10px; border: 1px solid #ffeeba; margin-bottom: 20px; font-size: 12px;">
          <strong>SİSTEM BİLGİSİ:</strong> Bu e-posta normalde <u>${originalTo}</u> adresine gönderilecekti.<br>
          Yönetici modu aktif olduğu için sadece size (${adminEmail}) yönlendirildi.
        </div>
        <hr>
      `;

      const disclaimerText = `[SİSTEM BİLGİSİ: Bu e-posta normalde ${originalTo} adresine gönderilecekti. Yönetici modu aktif olduğu için sadece size yönlendirildi.]\n\n`;

      finalTo = adminEmail;
      finalHtml = disclaimerHtml + html;
      finalText = text ? (disclaimerText + text) : undefined;

      // Konuya da ekleyelim ki karışmasın
      finalSubject = `[ADMIN YÖNLENDİRME] ${subject}`;
    } else if (!to) {
      // Yönetici email yok ve TO yok -> Hata
      return errorResponse('Alıcı e-posta adresi (to) zorunludur veya Ayarlardan Yönetici E-postası tanımlanmalıdır.');
    }

    // E-posta seçenekleri
    const mailOptions: any = {
      from: `"${smtpFromName}" <${smtpFrom}>`,
      to: Array.isArray(finalTo) ? finalTo.join(', ') : finalTo,
      subject: finalSubject,
      html: finalHtml,
      text: finalText || finalHtml.replace(/<[^>]*>/g, ''), // HTML'den düz metin oluştur
    };

    if (attachments && Array.isArray(attachments)) {
      mailOptions.attachments = attachments;
    }

    // E-postayı gönder
    const info = await transporter.sendMail(mailOptions);

    console.log('E-posta gönderildi:', info.messageId);

    return successResponse({
      success: true,
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('E-posta gönderim hatası:', error);

    let errorMessage = error.message || 'E-posta gönderimi sırasında bir hata oluştu';

    // Google Auth Hatası Yakalama (534-5.7.9)
    if (errorMessage.includes('Application-specific password required') || errorMessage.includes('534')) {
      errorMessage = 'GÜVENLİK HATASI: Google hesabınızda "Daha Az Güvenli Uygulamalar" kapalı olduğu için e-posta gönderilemiyor. Lütfen Gmail ayarlarınızdan "Uygulama Şifresi" (App Password) oluşturun ve Ayarlar sayfasında şifre alanına bu 16 haneli kodu girin. Kendi giriş şifrenizi kullanmayın.';
    } else if (errorMessage.includes('Invalid login') || errorMessage.includes('Username and Password not accepted')) {
      errorMessage = 'KİMLİK DOĞRULAMA HATASI: Kullanıcı adı veya şifre yanlış. Eğer Gmail kullanıyorsanız mutlaka uygulama şifresi kullanmalısınız.';
    }

    return serverErrorResponse(errorMessage);
  }
}

/**
 * GET /api/email/send
 * SMTP yapılandırmasını test et
 */
export async function GET(request: NextRequest) {
  try {
    // Supabase'den ayarları çek
    const supabase = await createClient();
    const { data: settingsData } = await supabase
      .from('ayarlar')
      .select('key, value')
      .in('key', ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_password', 'smtp_secure', 'email_from', 'email_from_name']);

    // Ayarları objeye çevir
    const settings: Record<string, string> = {};
    settingsData?.forEach(row => {
      if (row.value) settings[row.key] = row.value;
    });

    const smtpHost = settings.smtp_host || process.env.SMTP_HOST;
    const smtpUser = settings.smtp_user || process.env.SMTP_USER;
    const smtpPassword = settings.smtp_password || process.env.SMTP_PASSWORD;

    const config = {
      source: settings.smtp_host ? 'database' : 'environment',
      hasSmtpConfig: !!(smtpHost && smtpUser && smtpPassword),
      smtpHost: smtpHost ? `${smtpHost}` : 'YOK', // Güvenlik için tamamını göstermeyebiliriz ama debug için lazım olabilir
      smtpUser: smtpUser,
      smtpPassword: smtpPassword ? '***' : 'YOK',
      smtpPort: settings.smtp_port || process.env.SMTP_PORT || '587',
      smtpSecure: settings.smtp_secure === 'true' || (process.env.SMTP_SECURE === 'true'),
      emailFrom: settings.email_from || process.env.EMAIL_FROM || 'YOK',
      emailFromName: settings.email_from_name || process.env.EMAIL_FROM_NAME || 'YOK',
      emailProvider: process.env.EMAIL_PROVIDER || 'smtp',
      nodeEnv: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
    };

    return successResponse(config);
  } catch (error: any) {
    console.error('SMTP test hatası:', error);
    return serverErrorResponse(error.message);
  }
}