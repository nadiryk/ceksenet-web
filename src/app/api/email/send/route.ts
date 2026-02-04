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
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, subject, html, text } = body;

    if (!to || !subject || !html) {
      return errorResponse('to, subject ve html alanları zorunludur');
    }

    // SMTP yapılandırması
    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
    const smtpUser = process.env.SMTP_USER;
    const smtpPassword = process.env.SMTP_PASSWORD;
    const smtpFrom = process.env.EMAIL_FROM || 'noreply@ceksenet.com';
    const smtpFromName = process.env.EMAIL_FROM_NAME || 'ÇekSenet Web';

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
        message: 'E-posta simülasyon modunda işlendi (gerçek gönderim yapılmadı)',
        timestamp: new Date().toISOString(),
      });
    }

    // Nodemailer transporter oluştur
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465, // SSL için 465, TLS için 587
      auth: {
        user: smtpUser,
        pass: smtpPassword,
      },
      // Geliştirme ortamında TLS sertifikasını doğrulama
      ...(process.env.NODE_ENV !== 'production' && {
        tls: {
          rejectUnauthorized: false,
        },
      }),
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
    const smtpHost = process.env.SMTP_HOST;
    const smtpUser = process.env.SMTP_USER;
    const smtpPassword = process.env.SMTP_PASSWORD;

    const config = {
      hasSmtpConfig: !!(smtpHost && smtpUser && smtpPassword),
      smtpHost: smtpHost ? `${smtpHost.substring(0, 10)}...` : 'YOK',
      smtpUser: smtpUser ? `${smtpUser.substring(0, 5)}...` : 'YOK',
      smtpPassword: smtpPassword ? '***' : 'YOK',
      emailFrom: process.env.EMAIL_FROM || 'YOK',
      emailFromName: process.env.EMAIL_FROM_NAME || 'YOK',
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