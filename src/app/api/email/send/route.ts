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
    const { to, subject, html, text } = body;

    if (!to || !subject || !html) {
      return errorResponse('to, subject ve html alanları zorunludur');
    }

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

    // SMTP yapılandırması (DB öncelikli, yoksa ENV)
    const smtpHost = settings.smtp_host || process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = parseInt(settings.smtp_port || process.env.SMTP_PORT || '587', 10);
    const smtpUser = settings.smtp_user || process.env.SMTP_USER;
    const smtpPassword = settings.smtp_password || process.env.SMTP_PASSWORD;
    const smtpSecure = settings.smtp_secure === 'true' || (process.env.SMTP_SECURE === 'true');

    const smtpFrom = settings.email_from || process.env.EMAIL_FROM || 'noreply@ceksenet.com';
    const smtpFromName = settings.email_from_name || process.env.EMAIL_FROM_NAME || 'ÇekSenet Web';

    // Eğer SMTP bilgileri yoksa simülasyon modunda çalış
    if (!smtpUser || !smtpPassword) {
      console.warn('SMTP bilgileri eksik, simülasyon modunda çalışılıyor');
      console.log('Simülasyon e-posta:', {
        to,
        subject,
        htmlLength: html.length,
        textLength: text?.length || 0,
      });

      return successResponse({
        success: true,
        simulated: true,
        message: 'E-posta simülasyon modunda işlendi (gerçek gönderim yapılmadı - SMTP ayarları eksik)',
        timestamp: new Date().toISOString(),
      });
    }

    // Nodemailer transporter oluştur
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465 || smtpSecure, // 465 ise true, değilse ayara bak
      auth: {
        user: smtpUser,
        pass: smtpPassword,
      },
      // Geliştirme ortamında veya açıkça istenirse TLS sertifikasını doğrulama
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === 'production' && !settings.smtp_secure
      }
    });

    // E-posta seçenekleri
    const mailOptions = {
      from: `"${smtpFromName}" <${smtpFrom}>`,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''), // HTML'den düz metin oluştur
    };

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

    return serverErrorResponse(
      error.message || 'E-posta gönderimi sırasında bir hata oluştu'
    );
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