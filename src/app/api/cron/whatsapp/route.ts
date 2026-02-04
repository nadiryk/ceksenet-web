import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { whatsappService } from '@/lib/whatsapp'
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  serverErrorResponse,
} from '@/lib/api/response'
import { requireAuth, isAuthError } from '@/lib/api/auth'

/**
 * GET /api/cron/whatsapp
 * Bekleyen WhatsApp mesajlarını işle ve ödeme hatırlatmalarını gönder
 *
 * Query params:
 * - process_pending: true/false (varsayılan: true)
 * - send_reminders: true/false (varsayılan: true)
 * - limit: sayı (varsayılan: 10)
 *
 * Not: Bu endpoint cron job tarafından çağrılmalıdır.
 * CRON_SECRET ile korunabilir.
 */
export async function GET(request: NextRequest) {
  try {
    // CRON_SECRET ile yetkilendirme
    const cronSecret = process.env.CRON_SECRET
    const authHeader = request.headers.get('Authorization')
    
    if (cronSecret && authHeader) {
      // Bearer token kontrolü
      const token = authHeader.replace('Bearer ', '')
      if (token === cronSecret) {
        // Geçerli secret, auth bypass
        console.log('Cron secret ile yetkilendirme başarılı')
      } else {
        return forbiddenResponse('Geçersiz cron secret')
      }
    } else {
      // Eski auth yöntemi (admin kontrolü)
      try {
        const user = await requireAuth()
        const supabase = await createClient()
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()
        
        if (!profile || profile.role !== 'admin') {
          return forbiddenResponse('Bu işlem için admin yetkisi gereklidir')
        }
      } catch (authError) {
        // Auth hatası, cron secret yoksa erişim reddedilebilir
        if (!cronSecret) {
          return unauthorizedResponse('Yetkilendirme gereklidir')
        }
        // Cron secret varsa ama header'da yoksa yine reddet
        return unauthorizedResponse('Yetkilendirme gereklidir')
      }
    }
    
    const { searchParams } = new URL(request.url)
    const processPending = searchParams.get('process_pending') !== 'false'
    const sendReminders = searchParams.get('send_reminders') !== 'false'
    const limit = parseInt(searchParams.get('limit') || '10', 10)
    
    const results: any = {
      timestamp: new Date().toISOString(),
      processPending,
      sendReminders,
      limit,
    }
    
    // 1. WhatsApp aktif mi kontrol et
    const isActive = await whatsappService.isWhatsAppActive()
    if (!isActive) {
      results.message = 'WhatsApp bildirimleri pasif durumda'
      return successResponse(results)
    }
    
    // 2. Ödeme hatırlatmalarını tetikle (veritabanı fonksiyonu)
    if (sendReminders) {
      try {
        const supabaseAdmin = await createClient()
        const { error: reminderError } = await supabaseAdmin
          .rpc('send_payment_reminders')
        
        if (reminderError) {
          console.error('Ödeme hatırlatma fonksiyonu hatası:', reminderError)
          results.reminderError = reminderError.message
        } else {
          results.remindersTriggered = true
        }
      } catch (error: any) {
        console.error('Ödeme hatırlatma hatası:', error)
        results.reminderError = error.message
      }
    }
    
    // 3. Bekleyen mesajları işle
    if (processPending) {
      const { sent, failed } = await whatsappService.processPendingMessages()
      results.pendingMessages = {
        sent,
        failed,
        total: sent + failed
      }
    }
    
    // 4. İstatistikleri topla
    const supabaseForStats = await createClient()
    const { count: pendingCount } = await supabaseForStats
      .from('whatsapp_loglari')
      .select('*', { count: 'exact', head: true })
      .eq('durum', 'bekliyor')
    
    const { count: sentCount } = await supabaseForStats
      .from('whatsapp_loglari')
      .select('*', { count: 'exact', head: true })
      .eq('durum', 'gonderildi')
    
    const { count: errorCount } = await supabaseForStats
      .from('whatsapp_loglari')
      .select('*', { count: 'exact', head: true })
      .eq('durum', 'hata')
    
    results.stats = {
      pending: pendingCount || 0,
      sent: sentCount || 0,
      error: errorCount || 0,
      total: (pendingCount || 0) + (sentCount || 0) + (errorCount || 0)
    }
    
    return successResponse(results)
    
  } catch (error) {
    if (isAuthError(error)) {
      return error.status === 401 
        ? unauthorizedResponse(error.message)
        : forbiddenResponse(error.message)
    }
    console.error('WhatsApp cron hatası:', error)
    return serverErrorResponse()
  }
}

/**
 * POST /api/cron/whatsapp
 * Manuel olarak WhatsApp mesajı gönder
 * 
 * Body:
 * - telefon: string (zorunlu)
 * - mesaj: string (zorunlu)
 * - evrak_id?: number
 * - kredi_taksit_id?: number
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    
    // Sadece adminler
    const supabase = await createClient()
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    if (!profile || profile.role !== 'admin') {
      return forbiddenResponse('Bu işlem için admin yetkisi gereklidir')
    }
    
    const body = await request.json()
    
    if (!body.telefon || !body.mesaj) {
      return errorResponse('Telefon ve mesaj zorunludur')
    }
    
    const success = await whatsappService.sendSingleMessage({
      telefon: body.telefon,
      mesaj: body.mesaj,
      evrak_id: body.evrak_id,
      kredi_taksit_id: body.kredi_taksit_id,
    })
    
    return successResponse({
      success,
      message: success ? 'Mesaj gönderildi' : 'Mesaj gönderilemedi',
      telefon: body.telefon,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    if (isAuthError(error)) {
      return error.status === 401 
        ? unauthorizedResponse(error.message)
        : forbiddenResponse(error.message)
    }
    console.error('WhatsApp manuel gönderme hatası:', error)
    return serverErrorResponse()
  }
}