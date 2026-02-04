// ============================================
// ÇekSenet Web - E-posta Gönderme Servisi
// ============================================

import { createClient } from '@/lib/supabase/server';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export interface EmailAttachment {
  filename: string;
  content?: string;
  path?: string;
  encoding?: string;
}

/**
 * E-posta gönderme servisi
 * SMTP veya SendGrid gibi servislerle entegre edilebilir
 */
export class EmailService {
  private supabase: any;

  constructor() {
    // Supabase client'ı async olarak oluşturulacak
  }

  async initialize() {
    this.supabase = await createClient();
  }

  /**
   * E-posta gönder
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      // Çevresel değişkenlerden e-posta yapılandırmasını al
      const emailProvider = process.env.EMAIL_PROVIDER || 'smtp';
      
      switch (emailProvider.toLowerCase()) {
        case 'sendgrid':
          return await this.sendWithSendGrid(options);
        case 'smtp':
        default:
          return await this.sendWithSMTP(options);
      }
    } catch (error) {
      console.error('E-posta gönderim hatası:', error);
      return false;
    }
  }

  /**
   * SendGrid ile e-posta gönder
   */
  private async sendWithSendGrid(options: EmailOptions): Promise<boolean> {
    const apiKey = process.env.SENDGRID_API_KEY;
    
    if (!apiKey) {
      console.error('SendGrid API anahtarı bulunamadı. Lütfen SENDGRID_API_KEY çevresel değişkenini ayarlayın.');
      return false;
    }

    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{
            to: Array.isArray(options.to) 
              ? options.to.map(email => ({ email })) 
              : [{ email: options.to }]
          }],
          from: {
            email: process.env.EMAIL_FROM || 'noreply@ceksenet.com',
            name: process.env.EMAIL_FROM_NAME || 'ÇekSenet Web'
          },
          subject: options.subject,
          content: [
            {
              type: 'text/html',
              value: options.html
            },
            ...(options.text ? [{
              type: 'text/plain',
              value: options.text
            }] : [])
          ]
        }),
      });

      const success = response.ok;
      if (!success) {
        const errorText = await response.text();
        console.error('SendGrid hatası:', errorText);
      }
      
      return success;
    } catch (error) {
      console.error('SendGrid API hatası:', error);
      return false;
    }
  }

  /**
   * SMTP ile e-posta gönder (Nodemailer benzeri, fetch ile)
   */
  private async sendWithSMTP(options: EmailOptions): Promise<boolean> {
    // SMTP sunucusu için API endpoint kullanacağız
    // Bu fonksiyon bir backend API'sini çağırmalı
    // Alternatif olarak doğrudan SMTP bağlantısı kurulabilir ama Next.js edge'de mümkün değil
    // Bu nedenle bir API route kullanacağız
    
    try {
      const response = await fetch('/api/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('SMTP API hatası:', errorText);
        return false;
      }

      return true;
    } catch (error) {
      console.error('SMTP gönderim hatası:', error);
      return false;
    }
  }

  /**
   * Admin kullanıcılarının e-posta adreslerini al
   */
  async getAdminEmails(): Promise<string[]> {
    if (!this.supabase) await this.initialize();

    try {
      const { data: profiles, error } = await this.supabase
        .from('profiles')
        .select('id, ad_soyad, role, auth:auth.users(email)')
        .eq('role', 'admin');

      if (error) {
        console.error('Admin e-postaları alınırken hata:', error);
        return [];
      }

      // E-posta adreslerini çıkar
      const emails: string[] = [];
      
      // Alternatif: auth.users tablosuna join yapmak yerine ayarlardan al
      // Şimdilik sabit bir e-posta listesi döndürelim
      const defaultEmail = process.env.ADMIN_EMAIL;
      if (defaultEmail) {
        emails.push(defaultEmail);
      }

      // Eğer ayarlarda e-posta listesi varsa onu da ekle
      const { data: settings } = await this.supabase
        .from('ayarlar')
        .select('value')
        .eq('key', 'admin_emails')
        .single();

      if (settings?.value) {
        const additionalEmails = settings.value.split(',').map((email: string) => email.trim());
        emails.push(...additionalEmails);
      }

      // Benzersiz e-postalar
      return [...new Set(emails.filter(email => email && email.includes('@')))];
    } catch (error) {
      console.error('Admin e-postaları alınırken hata:', error);
      return [];
    }
  }

  /**
   * Günlük rapor e-postası gönder
   */
  async sendDailyReport(reportData: any): Promise<boolean> {
    const adminEmails = await this.getAdminEmails();
    
    if (adminEmails.length === 0) {
      console.warn('Günlük rapor gönderilemedi: Admin e-posta adresi bulunamadı.');
      return false;
    }

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const formattedDate = today.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    const htmlContent = this.generateDailyReportHTML(reportData, formattedDate);
    const textContent = this.generateDailyReportText(reportData, formattedDate);

    const emailOptions: EmailOptions = {
      to: adminEmails,
      subject: `ÇekSenet Günlük Raporu - ${formattedDate}`,
      html: htmlContent,
      text: textContent
    };

    return await this.sendEmail(emailOptions);
  }

  /**
   * Günlük rapor HTML içeriği oluştur
   */
  private generateDailyReportHTML(reportData: any, date: string): string {
    return `
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Günlük Rapor - ${date}</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
    .header { background: #3b82f6; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; }
    .section { margin-bottom: 30px; }
    .section-title { color: #1f2937; font-size: 18px; font-weight: bold; margin-bottom: 15px; padding-bottom: 8px; border-bottom: 2px solid #3b82f6; }
    .stat-card { background: white; border-radius: 6px; padding: 15px; margin-bottom: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .stat-label { color: #6b7280; font-size: 14px; }
    .stat-value { font-size: 24px; font-weight: bold; color: #1f2937; }
    .table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    .table th { background: #f3f4f6; text-align: left; padding: 10px; font-weight: bold; color: #4b5563; }
    .table td { padding: 10px; border-bottom: 1px solid #e5e7eb; }
    .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
    .badge-success { background: #d1fae5; color: #065f46; }
    .badge-warning { background: #fef3c7; color: #92400e; }
    .badge-danger { background: #fee2e2; color: #991b1b; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>ÇekSenet Günlük Raporu</h1>
    <p>${date} - Bir önceki günün özeti ve yaklaşan vadeler</p>
  </div>
  
  <div class="content">
    <!-- Özet İstatistikler -->
    <div class="section">
      <div class="section-title">📊 Günlük Özet</div>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
        <div class="stat-card">
          <div class="stat-label">Yeni Evraklar</div>
          <div class="stat-value">${reportData.dailyStats?.newEvraklar || 0}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Durum Değişimi</div>
          <div class="stat-value">${reportData.dailyStats?.statusChanges || 0}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Toplam Tutar</div>
          <div class="stat-value">${reportData.dailyStats?.totalAmount || 0} TRY</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Yaklaşan Vadeler</div>
          <div class="stat-value">${reportData.upcomingEvraklar?.length || 0}</div>
        </div>
      </div>
    </div>

    <!-- Yeni Evraklar -->
    ${reportData.newEvraklar?.length > 0 ? `
    <div class="section">
      <div class="section-title">🆕 Yeni Eklenen Evraklar</div>
      <table class="table">
        <thead>
          <tr>
            <th>Evrak No</th>
            <th>Tip</th>
            <th>Tutar</th>
            <th>Vade</th>
            <th>Cari</th>
          </tr>
        </thead>
        <tbody>
          ${reportData.newEvraklar.slice(0, 5).map((evrak: any) => `
          <tr>
            <td>${evrak.evrak_no}</td>
            <td><span class="badge ${evrak.evrak_tipi === 'cek' ? 'badge-success' : 'badge-warning'}">${evrak.evrak_tipi === 'cek' ? 'Çek' : 'Senet'}</span></td>
            <td>${evrak.tutar} ${evrak.para_birimi}</td>
            <td>${new Date(evrak.vade_tarihi).toLocaleDateString('tr-TR')}</td>
            <td>${evrak.cari_adi || '-'}</td>
          </tr>
          `).join('')}
        </tbody>
      </table>
      ${reportData.newEvraklar.length > 5 ? `<p><em>+ ${reportData.newEvraklar.length - 5} daha fazla evrak</em></p>` : ''}
    </div>
    ` : ''}

    <!-- Yaklaşan Vadeler -->
    ${reportData.upcomingEvraklar?.length > 0 ? `
    <div class="section">
      <div class="section-title">⏰ Yaklaşan Vadeler (7 gün)</div>
      <table class="table">
        <thead>
          <tr>
            <th>Evrak No</th>
            <th>Tip</th>
            <th>Tutar</th>
            <th>Kalan Gün</th>
            <th>Cari</th>
          </tr>
        </thead>
        <tbody>
          ${reportData.upcomingEvraklar.slice(0, 5).map((evrak: any) => `
          <tr>
            <td>${evrak.evrak_no}</td>
            <td><span class="badge ${evrak.evrak_tipi === 'cek' ? 'badge-success' : 'badge-warning'}">${evrak.evrak_tipi === 'cek' ? 'Çek' : 'Senet'}</span></td>
            <td>${evrak.tutar} ${evrak.para_birimi}</td>
            <td><span class="badge ${evrak.kalan_gun <= 3 ? 'badge-danger' : 'badge-warning'}">${evrak.kalan_gun} gün</span></td>
            <td>${evrak.cari_adi || '-'}</td>
          </tr>
          `).join('')}
        </tbody>
      </table>
      ${reportData.upcomingEvraklar.length > 5 ? `<p><em>+ ${reportData.upcomingEvraklar.length - 5} daha fazla evrak</em></p>` : ''}
    </div>
    ` : ''}

    <!-- Yaklaşan Kredi Taksitleri -->
    ${reportData.upcomingTaksitler?.length > 0 ? `
    <div class="section">
      <div class="section-title">🏦 Yaklaşan Kredi Taksitleri</div>
      <table class="table">
        <thead>
          <tr>
            <th>Kredi</th>
            <th>Taksit No</th>
            <th>Tutar</th>
            <th>Vade Tarihi</th>
            <th>Kalan Gün</th>
          </tr>
        </thead>
        <tbody>
          ${reportData.upcomingTaksitler.slice(0, 5).map((taksit: any) => `
          <tr>
            <td>${taksit.kredi_id}</td>
            <td>${taksit.taksit_no}</td>
            <td>${taksit.tutar} ${taksit.para_birimi || 'TRY'}</td>
            <td>${new Date(taksit.vade_tarihi).toLocaleDateString('tr-TR')}</td>
            <td><span class="badge ${taksit.kalan_gun <= 3 ? 'badge-danger' : 'badge-warning'}">${taksit.kalan_gun} gün</span></td>
          </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    ` : ''}

    <div class="footer">
      <p>Bu e-posta otomatik olarak gönderilmiştir. ÇekSenet Web uygulaması tarafından oluşturuldu.</p>
      <p><a href="${process.env.APP_URL || 'https://ceksenet.com'}">Sisteme giriş yapın</a></p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Günlük rapor düz metin içeriği oluştur
   */
  private generateDailyReportText(reportData: any, date: string): string {
    let text = `ÇEK SENET GÜNLÜK RAPORU - ${date}\n`;
    text += '='.repeat(50) + '\n\n';
    
    text += `Yeni Evraklar: ${reportData.dailyStats?.newEvraklar || 0}\n`;
    text += `Durum Değişimleri: ${reportData.dailyStats?.statusChanges || 0}\n`;
    text += `Toplam Tutar: ${reportData.dailyStats?.totalAmount || 0} TRY\n`;
    text += `Yaklaşan Vadeler: ${reportData.upcomingEvraklar?.length || 0}\n\n`;
    
    if (reportData.newEvraklar?.length > 0) {
      text += 'YENİ EKLEDİĞİNİZ EVRAKLAR:\n';
      reportData.newEvraklar.slice(0, 3).forEach((evrak: any) => {
        text += `- ${evrak.evrak_no}: ${evrak.tutar} ${evrak.para_birimi} (Vade: ${new Date(evrak.vade_tarihi).toLocaleDateString('tr-TR')})\n`;
      });
      text += '\n';
    }
    
    if (reportData.upcomingEvraklar?.length > 0) {
      text += 'YAKLAŞAN VADELER (7 gün içinde):\n';
      reportData.upcomingEvraklar.slice(0, 5).forEach((evrak: any) => {
        text += `- ${evrak.evrak_no}: ${evrak.tutar} ${evrak.para_birimi} (${evrak.kalan_gun} gün kaldı)\n`;
      });
      text += '\n';
    }
    
    text += 'Bu rapor ÇekSenet Web uygulaması tarafından otomatik olarak oluşturulmuştur.\n';
    text += `Uygulamaya giriş: ${process.env.APP_URL || 'https://ceksenet.com'}\n`;
    
    return text;
  }
}

// Singleton instance
export const emailService = new EmailService();