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
 * GET /api/krediler/ozet
 * Tüm krediler için genel özet (Dashboard için)
 * 
 * Response:
 * - aktif_kredi_sayisi: number
 * - toplam_borc: number (kalan taksit toplamı)
 * - bu_ay_odeme: number
 * - geciken_taksit_sayisi: number
 * - geciken_tutar: number
 * - kredi_turleri: Array<{ tur, adet, toplam }>
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth()
    
    const supabase = await createClient()
    
    // Bugünün tarihi
    const bugun = new Date()
    const bugunStr = bugun.toISOString().split('T')[0]
    
    // Bu ayın başı ve sonu
    const ayBasi = new Date(bugun.getFullYear(), bugun.getMonth(), 1)
    const aySonu = new Date(bugun.getFullYear(), bugun.getMonth() + 1, 0)
    const ayBasiStr = ayBasi.toISOString().split('T')[0]
    const aySonuStr = aySonu.toISOString().split('T')[0]
    
    // 1. Kredi özeti
    const { data: krediler, error: krediError } = await supabase
      .from('krediler')
      .select('id, kredi_turu, anapara, toplam_odeme, durum, para_birimi')
    
    if (krediError) {
      console.error('Kredi özet hatası:', krediError)
      return serverErrorResponse('Kredi bilgileri yüklenirken hata oluştu')
    }
    
    const aktifKrediler = krediler?.filter(k => k.durum === 'aktif') || []
    const aktifKrediIds = aktifKrediler.map(k => k.id)
    
    // 2. Tüm taksitleri çek (aktif krediler için)
    let tumTaksitler: Array<{
      kredi_id: number
      vade_tarihi: string
      tutar: number
      durum: string
      odenen_tutar: number | null
    }> = []
    
    if (aktifKrediIds.length > 0) {
      const { data: taksitler, error: taksitError } = await supabase
        .from('kredi_taksitler')
        .select('kredi_id, vade_tarihi, tutar, durum, odenen_tutar')
        .in('kredi_id', aktifKrediIds)
      
      if (taksitError) {
        console.error('Taksit özet hatası:', taksitError)
      } else {
        tumTaksitler = taksitler || []
      }
    }
    
    // 3. Hesaplamalar
    let toplamBorc = 0
    let buAyOdeme = 0
    let gecikenTaksitSayisi = 0
    let gecikenTutar = 0
    
    for (const taksit of tumTaksitler) {
      // Ödenmemiş taksitler (bekliyor veya gecikti)
      if (taksit.durum !== 'odendi') {
        toplamBorc += taksit.tutar
        
        // Geciken taksitler (vadesi geçmiş ve ödenmemiş)
        if (taksit.vade_tarihi < bugunStr) {
          gecikenTaksitSayisi++
          gecikenTutar += taksit.tutar
        }
        
        // Bu ay ödenecekler (vadesi bu ay içinde ve ödenmemiş)
        if (taksit.vade_tarihi >= ayBasiStr && taksit.vade_tarihi <= aySonuStr) {
          buAyOdeme += taksit.tutar
        }
      }
    }
    
    // 4. Kredi türlerine göre dağılım (aktif krediler)
    const turDagilimi: Record<string, { adet: number; toplam: number }> = {}
    
    for (const kredi of aktifKrediler) {
      const tur = kredi.kredi_turu
      if (!turDagilimi[tur]) {
        turDagilimi[tur] = { adet: 0, toplam: 0 }
      }
      turDagilimi[tur].adet++
      turDagilimi[tur].toplam += kredi.anapara || 0
    }
    
    const krediTurleri = Object.entries(turDagilimi).map(([tur, data]) => ({
      tur,
      adet: data.adet,
      toplam: Math.round(data.toplam * 100) / 100
    }))
    
    // 5. Sonuç
    const ozet = {
      aktif_kredi_sayisi: aktifKrediler.length,
      toplam_kredi_sayisi: krediler?.length || 0,
      toplam_borc: Math.round(toplamBorc * 100) / 100,
      bu_ay_odeme: Math.round(buAyOdeme * 100) / 100,
      geciken_taksit_sayisi: gecikenTaksitSayisi,
      geciken_tutar: Math.round(gecikenTutar * 100) / 100,
      kredi_turleri: krediTurleri
    }
    
    return successResponse(ozet)
    
  } catch (error) {
    if (isAuthError(error)) {
      return error.status === 401 
        ? unauthorizedResponse(error.message)
        : forbiddenResponse(error.message)
    }
    console.error('Kredi özet GET hatası:', error)
    return serverErrorResponse()
  }
}
