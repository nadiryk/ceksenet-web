import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth, isAuthError } from '@/lib/api/auth';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  serverErrorResponse,
} from '@/lib/api/response';
import { telegramService } from '@/lib/telegram';

/**
 * POST /api/telegram/send
 * Telegram'a mesaj gönderir (evrak bilgisi ile)
 * Body: { evrakId: number, chatId?: string, customMessage?: string }
 */
export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    const body = await request.json();
    const { evrakId, chatId, customMessage } = body;

    if (!evrakId) {
      return errorResponse('Evrak ID gereklidir.');
    }

    const supabase = await createClient();

    // Evrak bilgilerini getir
    const { data: evrak, error: evrakError } = await supabase
      .from('evraklar')
      .select(`
        *,
        cari:cariler(id, ad_soyad, tip, telefon, email),
        banka:bankalar(id, ad)
      `)
      .eq('id', evrakId)
      .single();

    if (evrakError || !evrak) {
      return errorResponse('Evrak bulunamadı.', 404);
    }

    // Telegram servisini başlat
    await telegramService.initialize();

    // Ayarları kontrol et
    const settings = await telegramService.checkSettings();
    if (!settings.isActive || !settings.hasToken || !settings.hasChatId) {
      return errorResponse(
        'Telegram ayarları eksik veya aktif değil. Lütfen ayarlar sayfasından yapılandırın.',
        400
      );
    }

    let result;
    if (customMessage) {
      // Özel mesaj gönder
      result = await telegramService.sendMessage(customMessage, {
        chatId: chatId || undefined,
        parseMode: 'Markdown',
      });
    } else {
      // Evrak bilgileri ile şablon mesaj gönder
      result = await telegramService.sendEvrakMessage(evrak);
    }

    if (result.success) {
      return successResponse({
        message: 'Telegram mesajı başarıyla gönderildi.',
        messageId: result.messageId,
      });
    } else {
      return errorResponse(`Telegram mesajı gönderilemedi: ${result.error}`, 500);
    }

  } catch (error) {
    if (isAuthError(error)) {
      return error.status === 401
        ? unauthorizedResponse(error.message)
        : forbiddenResponse(error.message);
    }
    console.error('Telegram send hatası:', error);
    return serverErrorResponse();
  }
}

/**
 * GET /api/telegram/send?evrakId=...
 * Test amaçlı - sadece durum kontrolü
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    const url = new URL(request.url);
    const evrakId = url.searchParams.get('evrakId');

    if (!evrakId) {
      // Ayarları kontrol et
      const settings = await telegramService.checkSettings();
      return successResponse({
        telegramConfigured: settings.isActive && settings.hasToken && settings.hasChatId,
        settings,
      });
    }

    // Evrak bilgilerini getir
    const supabase = await createClient();
    const { data: evrak } = await supabase
      .from('evraklar')
      .select('id, evrak_no, evrak_tipi')
      .eq('id', parseInt(evrakId, 10))
      .single();

    return successResponse({
      evrak,
      message: 'Test için POST kullanın.',
    });

  } catch (error) {
    if (isAuthError(error)) {
      return error.status === 401
        ? unauthorizedResponse(error.message)
        : forbiddenResponse(error.message);
    }
    console.error('Telegram GET hatası:', error);
    return serverErrorResponse();
  }
}