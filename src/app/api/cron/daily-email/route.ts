import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { dailyReportService } from '@/lib/daily-report';
import { emailService } from '@/lib/email';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  serverErrorResponse,
} from '@/lib/api/response';
import { requireAuth, isAuthError } from '@/lib/api/auth';

/**
 * GET /api/cron/daily-email
 * Günlük e-posta raporu gönder
 * 
 * Query params:
 * - send_email: true/false (varsayılan: true)
 * - test_mode: true/false (varsayılan: false)
 * - test_email: test için e-posta adresi
 * 
 * Not: Bu endpoint cron job tarafından çağrılmalıdır.
 * Manuel olarak da tetiklenebilir (sadece admin).
 */
export async function GET(request: NextRequest) {
  try {
    // Cron için auth gerekli değil, ama API key veya secret ile korunabilir
    // Şimdilik sadece admin erişimi sağlayalım
    const user = await requireAuth();
    
    // Sadece adminler bu endpoint'i kullanabilir
    const supabase = await createClient();
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (!profile || profile.role !== 'admin') {
      return forbiddenResponse('Bu işlem için admin yetkisi gereklidir');
    }
    
    const { searchParams } = new URL(request.url);
    const sendEmail = searchParams.get('send_email') !== 'false';
    const testMode = searchParams.get('test_mode') === 'true';
    const testEmail = searchParams.get('test_email');
    
    const results: any = {
      timestamp: new Date().toISOString(),
      sendEmail,
      testMode,
      testEmail: testEmail || null,
    };

    // 1. Günlük rapor verilerini topla
    results.dataCollectionStarted = true;
    const reportData = await dailyReportService.collectDailyReport();
    results.dataCollected = true;
    results.reportStats = {
      newEvraklar: reportData.dailyStats.newEvraklar,
      statusChanges: reportData.dailyStats.statusChanges,
      upcomingEvraklar: reportData.upcomingEvraklar.length,
      upcomingTaksitler: reportData.upcomingTaksitler.length,
    };

    // 2. Test modu kontrolü
    if (testMode) {
      results.testMode = true;
      results.message = 'Test modu: E-posta gönderimi atlandı';
      
      // Test e-postası varsa gönder
      if (testEmail) {
        results.testEmailSent = true;
        
        const testReportData = {
          ...reportData,
          dailyStats: {
            ...reportData.dailyStats,
            testMode: true
          }
        };

        const testSuccess = await emailService.sendEmail({
          to: testEmail,
          subject: `[TEST] ÇekSenet Günlük Raporu - ${reportData.reportDateRange.reportDate}`,
          html: emailService['generateDailyReportHTML'](testReportData, reportData.reportDateRange.reportDate),
          text: emailService['generateDailyReportText'](testReportData, reportData.reportDateRange.reportDate),
        });

        results.testEmailSuccess = testSuccess;
      }
      
      return successResponse(results);
    }

    // 3. Gerçek e-posta gönderimi
    if (sendEmail) {
      results.emailSendingStarted = true;
      
      try {
        const emailSuccess = await emailService.sendDailyReport(reportData);
        results.emailSent = emailSuccess;
        
        if (emailSuccess) {
          results.message = 'Günlük e-posta raporu başarıyla gönderildi';
        } else {
          results.message = 'Günlük e-posta raporu gönderilemedi';
          results.warning = 'E-posta gönderimi başarısız oldu';
        }
      } catch (emailError: any) {
        console.error('E-posta gönderim hatası:', emailError);
        results.emailError = emailError.message;
        results.emailSent = false;
      }
    } else {
      results.message = 'E-posta gönderimi devre dışı bırakıldı';
    }

    // 4. Log kaydı oluştur (opsiyonel)
    try {
      const { error: logError } = await supabase
        .from('email_loglari')
        .insert({
          tip: 'gunluk_rapor',
          durum: results.emailSent ? 'gonderildi' : 'hata',
          alici_sayisi: results.emailSent ? (await emailService.getAdminEmails()).length : 0,
          hata_mesaji: results.emailError || null,
          created_by: user.id,
        });

      if (logError) {
        console.error('Log kaydı oluşturma hatası:', logError);
      }
    } catch (logError) {
      // Log hatası kritik değil
      console.warn('Log kaydı oluşturulamadı:', logError);
    }

    return successResponse(results);
    
  } catch (error) {
    if (isAuthError(error)) {
      return error.status === 401 
        ? unauthorizedResponse() 
        : forbiddenResponse();
    }
    
    console.error('Günlük e-posta cron hatası:', error);
    return serverErrorResponse(error instanceof Error ? error.message : 'Bilinmeyen hata');
  }
}

/**
 * POST /api/cron/daily-email
 * Manuel tetikleme için (aynı işlevi görür)
 */
export async function POST(request: NextRequest) {
  return GET(request);
}