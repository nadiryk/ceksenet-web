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
 * GET /api/krediler/taksitler/geciken
 * Vadesi geçmiş, ödenmemiş taksitler (aktif kredilerden)
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth()
    
    const supabase = await createClient()
    
    // Bugünün tarihi
    const bugun = new Date().toISOString().split('T')[0]
    
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
      return successResponse({ data: [], toplam_tutar: 0, en_eski_gecikme: null })
    }
    
    const aktifKrediIds = aktifKrediler.map(k => k.id)
    
    // Geciken taksitler (vadesi geçmiş ve ödenmemiş)
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
      .lt('vade_tarihi', bugun)
      .order('vade_tarihi', { ascending: true })
    
    if (taksitError) {
      console.error('Geciken taksitler hatası:', taksitError)
      return serverErrorResponse('Taksitler yüklenirken hata oluştu')
    }
    
    // Toplam tutar hesapla
    const toplamTutar = (taksitler || []).reduce((sum, t) => sum + t.tutar, 0)
    
    // En eski gecikme tarihi
    const enEskiGecikme = taksitler && taksitler.length > 0 
      ? taksitler[0].vade_tarihi 
      : null
    
    // Max gecikme gün sayısı
    let maxGecikmeGun = 0
    if (enEskiGecikme) {
      const enEskiTarih = new Date(enEskiGecikme)
      const bugunTarih = new Date()
      maxGecikmeGun = Math.floor((bugunTarih.getTime() - enEskiTarih.getTime()) / (1000 * 60 * 60 * 24))
    }
    
    return successResponse({
      data: taksitler || [],
      toplam_tutar: Math.round(toplamTutar * 100) / 100,
      en_eski_gecikme: enEskiGecikme,
      max_gecikme_gun: maxGecikmeGun
    })
    
  } catch (error) {
    if (isAuthError(error)) {
      return error.status === 401 
        ? unauthorizedResponse(error.message)
        : forbiddenResponse(error.message)
    }
    console.error('Geciken taksitler GET hatası:', error)
    return serverErrorResponse()
  }
}
