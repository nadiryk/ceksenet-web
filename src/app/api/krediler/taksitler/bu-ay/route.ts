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
 * GET /api/krediler/taksitler/bu-ay
 * Bu ay vadesi gelen tüm taksitler (aktif kredilerden)
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth()
    
    const supabase = await createClient()
    
    // Bu ayın başı ve sonu
    const bugun = new Date()
    const ayBasi = new Date(bugun.getFullYear(), bugun.getMonth(), 1)
    const aySonu = new Date(bugun.getFullYear(), bugun.getMonth() + 1, 0)
    const ayBasiStr = ayBasi.toISOString().split('T')[0]
    const aySonuStr = aySonu.toISOString().split('T')[0]
    
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
      return successResponse({ data: [], toplam_tutar: 0 })
    }
    
    const aktifKrediIds = aktifKrediler.map(k => k.id)
    
    // Bu ay vadesi gelen taksitler (ödenmemiş olanlar)
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
      .in('durum', ['bekliyor', 'gecikti'])
      .gte('vade_tarihi', ayBasiStr)
      .lte('vade_tarihi', aySonuStr)
      .order('vade_tarihi', { ascending: true })
    
    if (taksitError) {
      console.error('Bu ay taksitler hatası:', taksitError)
      return serverErrorResponse('Taksitler yüklenirken hata oluştu')
    }
    
    // Toplam tutar hesapla
    const toplamTutar = (taksitler || []).reduce((sum, t) => sum + t.tutar, 0)
    
    return successResponse({
      data: taksitler || [],
      toplam_tutar: Math.round(toplamTutar * 100) / 100
    })
    
  } catch (error) {
    if (isAuthError(error)) {
      return error.status === 401 
        ? unauthorizedResponse(error.message)
        : forbiddenResponse(error.message)
    }
    console.error('Bu ay taksitler GET hatası:', error)
    return serverErrorResponse()
  }
}
