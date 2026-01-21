import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth, isAuthError } from '@/lib/api/auth'
import {
  successResponse,
  unauthorizedResponse,
  forbiddenResponse,
  serverErrorResponse,
} from '@/lib/api/response'

/**
 * GET /api/krediler/taksitler/yaklasan
 * Yaklaşan taksitler (gelecek X gün içinde vadesi dolacak)
 * 
 * Query params:
 * - gun: number (default: 7) - Kaç gün içindeki taksitler
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth()
    
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    // Gün parametresi (default: 7)
    const gunParam = searchParams.get('gun')
    const gun = gunParam ? Math.max(1, Math.min(30, parseInt(gunParam, 10))) : 7
    
    // Bugün ve X gün sonrası
    const bugun = new Date()
    const bugunStr = bugun.toISOString().split('T')[0]
    
    const gelecek = new Date()
    gelecek.setDate(gelecek.getDate() + gun)
    const gelecekStr = gelecek.toISOString().split('T')[0]
    
    // Aktif kredilerin ID'lerini al
    const { data: aktifKrediler, error: krediError } = await supabase
      .from('krediler')
      .select('id')
      .eq('durum', 'aktif')
    
    if (krediError) {
      console.error('Aktif krediler hatası:', krediError)
      return serverErrorResponse('Krediler yüklenirken hata oluştu')
    }
    
    if (!aktifKrediler || aktifKrediler.length === 0) {
      return successResponse({ data: [], toplam_tutar: 0, gun_sayisi: gun })
    }
    
    const aktifKrediIds = aktifKrediler.map(k => k.id)
    
    // Yaklaşan taksitler (bugün dahil, gelecek X gün içinde, sadece bekliyor durumunda)
    const { data: taksitler, error: taksitError } = await supabase
      .from('kredi_taksitler')
      .select(`
        *,
        kredi:krediler(
          id,
          kredi_turu,
          para_birimi,
          banka:bankalar(id, ad)
        )
      `)
      .in('kredi_id', aktifKrediIds)
      .eq('durum', 'bekliyor')
      .gte('vade_tarihi', bugunStr)
      .lte('vade_tarihi', gelecekStr)
      .order('vade_tarihi', { ascending: true })
    
    if (taksitError) {
      console.error('Yaklaşan taksitler hatası:', taksitError)
      return serverErrorResponse('Taksitler yüklenirken hata oluştu')
    }
    
    // Toplam tutar hesapla
    const toplamTutar = (taksitler || []).reduce((sum, t) => sum + t.tutar, 0)
    
    return successResponse({
      data: taksitler || [],
      toplam_tutar: Math.round(toplamTutar * 100) / 100,
      gun_sayisi: gun
    })
    
  } catch (error) {
    if (isAuthError(error)) {
      return error.status === 401 
        ? unauthorizedResponse(error.message)
        : forbiddenResponse(error.message)
    }
    console.error('Yaklaşan taksitler GET hatası:', error)
    return serverErrorResponse()
  }
}
