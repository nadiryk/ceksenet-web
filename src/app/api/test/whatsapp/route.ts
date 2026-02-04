import { NextRequest } from 'next/server';
import { whatsappService } from '@/lib/whatsapp';
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
} from '@/lib/api/response';

/**
 * GET /api/test/whatsapp
 * WhatsApp servisini test et
 * 
 * Query params:
 * - phone: Test telefon numarası (örn: +905551234567)
 * - message: Test mesajı (varsayılan: "Test mesajı")
 * - simulate: true/false (varsayılan: true)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone') || '+905551234567';
    const message = searchParams.get('message') || 'Bu bir test mesajıdır. ÇekSenet Web WhatsApp servisi testi.';
    const simulate = searchParams.get('simulate') !== 'false';

    // WhatsApp aktif mi kontrol et
    const isActive = await whatsappService.isWhatsAppActive();
    
    // Simülasyon modunu geçici olarak ayarla
    if (simulate) {
      console.log('Test modu: Simülasyon aktif');
    }

    const results: any = {
      timestamp: new Date().toISOString(),
      phone,
      message,
      simulate,
      isWhatsAppActive: isActive,
      environment: {
        whatsappApiKey: process.env.WHATSAPP_API_KEY ? 'VAR' : 'YOK',
        whatsappUseRealApi: process.env.WHATSAPP_USE_REAL_API || 'false',
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'VAR' : 'YOK',
      },
    };

    // Bekleyen mesajları işle
    const pendingResult = await whatsappService.processPendingMessages();
    results.pendingMessages = pendingResult;

    // Tekil mesaj gönder
    if (phone && phone !== '+905551234567') {
      try {
        const success = await whatsappService.sendSingleMessage({
          telefon: phone,
          mesaj: message,
        });
        
        results.singleMessage = {
          success,
          sent: success,
          phone,
          messageLength: message.length,
        };
      } catch (error: any) {
        results.singleMessage = {
          success: false,
          error: error.message,
        };
      }
    }

    // İstatistikleri topla
    results.stats = {
      whatsappApiConfigured: !!process.env.WHATSAPP_API_KEY && 
                           process.env.WHATSAPP_API_KEY !== 'dummy' &&
                           process.env.WHATSAPP_USE_REAL_API === 'true',
      simulationMode: !process.env.WHATSAPP_API_KEY || 
                     process.env.WHATSAPP_API_KEY === 'dummy' ||
                     process.env.WHATSAPP_USE_REAL_API !== 'true',
    };

    results.recommendations = [
      'WHATSAPP_API_KEY ortam değişkenini CallMeBot API anahtarınızla ayarlayın',
      'WHATSAPP_USE_REAL_API=true olarak ayarlayın',
      'Supabase veritabanı bağlantısını gerçek URL ile yapılandırın',
      'whatsapp_loglari tablosunun veritabanında oluşturulduğundan emin olun',
    ];

    return successResponse(results);

  } catch (error: any) {
    console.error('WhatsApp test hatası:', error);
    return serverErrorResponse(error.message);
  }
}

/**
 * POST /api/test/whatsapp
 * Manuel test mesajı gönder
 * 
 * Body:
 * - phone: Telefon numarası (zorunlu)
 * - message: Mesaj içeriği (zorunlu)
 * - simulate: true/false
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, message, simulate } = body;

    if (!phone || !message) {
      return errorResponse('phone ve message alanları zorunludur');
    }

    console.log(`Test WhatsApp mesajı gönderiliyor: ${phone}`);

    const success = await whatsappService.sendSingleMessage({
      telefon: phone,
      mesaj: message,
    });

    return successResponse({
      success,
      phone,
      messageLength: message.length,
      timestamp: new Date().toISOString(),
      simulationMode: !process.env.WHATSAPP_API_KEY || 
                     process.env.WHATSAPP_API_KEY === 'dummy' ||
                     process.env.WHATSAPP_USE_REAL_API !== 'true',
      recommendations: success 
        ? 'Mesaj başarıyla gönderildi (simülasyon modunda)'
        : 'Mesaj gönderilemedi. API anahtarını ve ayarları kontrol edin.',
    });

  } catch (error: any) {
    console.error('WhatsApp test gönderme hatası:', error);
    return serverErrorResponse(error.message);
  }
}