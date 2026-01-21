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
 * GET /api/dashboard
 * Dashboard özet istatistikleri
 * 
 * Response:
 * - ozet: genel sayılar
 * - durum_dagilimi: evrak durumlarına göre dağılım
 * - tip_dagilimi: çek/senet dağılımı
 * - son_evraklar: son eklenen 5 evrak
 * - yaklasan_vadeler: yaklaşan 5 vade
 * - kredi_ozeti: kredi istatistikleri
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth()
    
    const supabase = await createClient()
    const today = new Date().toISOString().split('T')[0]
    const weekLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
    const monthEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]
    
    // 1. EVRAK İSTATİSTİKLERİ
    
    // Toplam evrak sayısı ve tutarı
    const { data: evrakToplam } = await supabase
      .from('evraklar')
      .select('id, tutar, para_birimi, doviz_kuru')
    
    const toplamEvrak = evrakToplam?.length || 0
    const toplamTutar = evrakToplam?.reduce((sum, e) => {
      // TRY'ye çevir
      if (e.para_birimi === 'TRY') {
        return sum + (e.tutar || 0)
      }
      return sum + (e.tutar || 0) * (e.doviz_kuru || 1)
    }, 0) || 0
    
    // Portföydeki evraklar
    const { count: portfoydeki } = await supabase
      .from('evraklar')
      .select('*', { count: 'exact', head: true })
      .eq('durum', 'portfoy')
    
    // Vadesi yaklaşan (7 gün içinde, portföy veya bankada)
    const { count: vadesiYaklasan } = await supabase
      .from('evraklar')
      .select('*', { count: 'exact', head: true })
      .in('durum', ['portfoy', 'bankada'])
      .gte('vade_tarihi', today)
      .lte('vade_tarihi', weekLater)
    
    // Vadesi geçen (portföy veya bankada olanlar)
    const { count: vadesiGecen } = await supabase
      .from('evraklar')
      .select('*', { count: 'exact', head: true })
      .in('durum', ['portfoy', 'bankada'])
      .lt('vade_tarihi', today)
    
    // 2. DURUM DAĞILIMI
    const durumlar = ['portfoy', 'bankada', 'ciro', 'tahsil', 'karsiliksiz']
    const durumDagilimi = []
    
    for (const durum of durumlar) {
      const { data: durumEvraklar } = await supabase
        .from('evraklar')
        .select('tutar, para_birimi, doviz_kuru')
        .eq('durum', durum)
      
      const adet = durumEvraklar?.length || 0
      const tutar = durumEvraklar?.reduce((sum, e) => {
        if (e.para_birimi === 'TRY') {
          return sum + (e.tutar || 0)
        }
        return sum + (e.tutar || 0) * (e.doviz_kuru || 1)
      }, 0) || 0
      
      durumDagilimi.push({ durum, adet, tutar })
    }
    
    // 3. TİP DAĞILIMI
    const tipler = ['cek', 'senet']
    const tipDagilimi = []
    
    for (const tip of tipler) {
      const { data: tipEvraklar } = await supabase
        .from('evraklar')
        .select('tutar, para_birimi, doviz_kuru')
        .eq('evrak_tipi', tip)
      
      const adet = tipEvraklar?.length || 0
      const tutar = tipEvraklar?.reduce((sum, e) => {
        if (e.para_birimi === 'TRY') {
          return sum + (e.tutar || 0)
        }
        return sum + (e.tutar || 0) * (e.doviz_kuru || 1)
      }, 0) || 0
      
      tipDagilimi.push({ tip, adet, tutar })
    }
    
    // 4. SON EVRAKLAR
    const { data: sonEvraklar } = await supabase
      .from('evraklar')
      .select(`
        id,
        evrak_tipi,
        evrak_no,
        tutar,
        para_birimi,
        vade_tarihi,
        durum,
        cari_id,
        cariler (ad_soyad)
      `)
      .order('created_at', { ascending: false })
      .limit(5)
    
    // 5. YAKLAŞAN VADELER
    const { data: yaklasanVadeler } = await supabase
      .from('evraklar')
      .select(`
        id,
        evrak_tipi,
        evrak_no,
        tutar,
        para_birimi,
        vade_tarihi,
        durum,
        cari_id,
        cariler (ad_soyad)
      `)
      .in('durum', ['portfoy', 'bankada'])
      .gte('vade_tarihi', today)
      .order('vade_tarihi', { ascending: true })
      .limit(5)
    
    // 6. KREDİ İSTATİSTİKLERİ
    
    // Aktif kredi sayısı
    const { count: aktifKredi } = await supabase
      .from('krediler')
      .select('*', { count: 'exact', head: true })
      .eq('durum', 'aktif')
    
    // Toplam kalan borç (aktif kredilerin bekleyen taksitleri)
    const { data: bekleyenTaksitler } = await supabase
      .from('kredi_taksitler')
      .select(`
        tutar,
        krediler!inner (durum)
      `)
      .eq('durum', 'bekliyor')
      .eq('krediler.durum', 'aktif')
    
    const toplamBorc = bekleyenTaksitler?.reduce((sum, t) => sum + (t.tutar || 0), 0) || 0
    
    // Bu ay ödenecek taksitler
    const { data: buAyTaksitler } = await supabase
      .from('kredi_taksitler')
      .select('tutar')
      .eq('durum', 'bekliyor')
      .gte('vade_tarihi', monthStart)
      .lte('vade_tarihi', monthEnd)
    
    const buAyTaksit = buAyTaksitler?.reduce((sum, t) => sum + (t.tutar || 0), 0) || 0
    
    // Geciken taksitler
    const { data: gecikenTaksitler } = await supabase
      .from('kredi_taksitler')
      .select('tutar')
      .eq('durum', 'bekliyor')
      .lt('vade_tarihi', today)
    
    const gecikenTaksit = gecikenTaksitler?.reduce((sum, t) => sum + (t.tutar || 0), 0) || 0
    const gecikenTaksitAdet = gecikenTaksitler?.length || 0
    
    // Response
    return successResponse({
      ozet: {
        toplam_evrak: toplamEvrak,
        toplam_tutar: Math.round(toplamTutar * 100) / 100,
        portfoydeki: portfoydeki || 0,
        vadesi_yaklasan: vadesiYaklasan || 0,
        vadesi_gecen: vadesiGecen || 0,
      },
      durum_dagilimi: durumDagilimi,
      tip_dagilimi: tipDagilimi,
      son_evraklar: sonEvraklar || [],
      yaklasan_vadeler: yaklasanVadeler || [],
      kredi_ozeti: {
        aktif_kredi: aktifKredi || 0,
        toplam_borc: Math.round(toplamBorc * 100) / 100,
        bu_ay_taksit: Math.round(buAyTaksit * 100) / 100,
        geciken_taksit: Math.round(gecikenTaksit * 100) / 100,
        geciken_taksit_adet: gecikenTaksitAdet,
      },
    })
    
  } catch (error) {
    if (isAuthError(error)) {
      return error.status === 401 
        ? unauthorizedResponse(error.message)
        : forbiddenResponse(error.message)
    }
    console.error('Dashboard GET hatası:', error)
    return serverErrorResponse()
  }
}
