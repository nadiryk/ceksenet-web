import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth, isAuthError } from '@/lib/api/auth'
import {
  successResponse,
  listResponse,
  errorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  serverErrorResponse,
  parsePagination,
} from '@/lib/api/response'

// ============================================
// SABİTLER
// ============================================

const KREDI_TURLERI = ['tuketici', 'konut', 'tasit', 'ticari', 'isletme', 'diger'] as const
const KREDI_DURUMLARI = ['aktif', 'kapandi', 'erken_kapandi'] as const
const PARA_BIRIMLERI = ['TRY', 'USD', 'EUR', 'GBP', 'CHF'] as const

// ============================================
// TAKSİT HESAPLAMA
// ============================================

/**
 * Aylık taksit tutarını hesapla (eşit taksitli / anuity)
 * @param anapara - Anapara tutarı
 * @param yillikFaiz - Yıllık faiz oranı (%)
 * @param vadeAy - Vade süresi (ay)
 * @returns Aylık taksit tutarı
 */
function taksitHesapla(anapara: number, yillikFaiz: number, vadeAy: number): number {
  const aylikFaiz = yillikFaiz / 100 / 12
  
  // Faizsiz kredi durumu
  if (aylikFaiz === 0) {
    return Math.round((anapara / vadeAy) * 100) / 100
  }
  
  // Anuity formülü: P * [r(1+r)^n] / [(1+r)^n - 1]
  const taksit = anapara * 
    (aylikFaiz * Math.pow(1 + aylikFaiz, vadeAy)) / 
    (Math.pow(1 + aylikFaiz, vadeAy) - 1)
  
  return Math.round(taksit * 100) / 100
}

/**
 * Taksit listesi oluştur (tarihler ve tutarlar)
 */
function taksitListesiOlustur(
  krediId: number, 
  aylikTaksit: number, 
  vadeAy: number, 
  baslangicTarihi: string
): Array<{
  kredi_id: number
  taksit_no: number
  vade_tarihi: string
  tutar: number
  durum: string
}> {
  const taksitler = []
  const baslangic = new Date(baslangicTarihi)
  
  for (let i = 1; i <= vadeAy; i++) {
    // Her taksit bir ay sonra
    const vadeTarihi = new Date(baslangic)
    vadeTarihi.setMonth(vadeTarihi.getMonth() + i)
    
    taksitler.push({
      kredi_id: krediId,
      taksit_no: i,
      vade_tarihi: vadeTarihi.toISOString().split('T')[0], // YYYY-MM-DD
      tutar: aylikTaksit,
      durum: 'bekliyor'
    })
  }
  
  return taksitler
}

// ============================================
// API ENDPOINTS
// ============================================

/**
 * GET /api/krediler
 * Kredi listesi (filtreleme ve sayfalama ile)
 * 
 * Query params:
 * - durum: 'aktif' | 'kapandi' | 'erken_kapandi'
 * - kredi_turu: 'tuketici' | 'konut' | 'tasit' | 'ticari' | 'isletme' | 'diger'
 * - banka_id: number
 * - page, limit
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth()
    
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    // Pagination
    const { page, limit, offset } = parsePagination(searchParams)
    
    // Filters
    const durum = searchParams.get('durum')
    const kredi_turu = searchParams.get('kredi_turu')
    const banka_id = searchParams.get('banka_id')
    
    // Query builder - banka bilgisi ile birlikte
    let query = supabase
      .from('krediler')
      .select(`
        *,
        banka:bankalar(id, ad)
      `, { count: 'exact' })
    
    // Durum filtresi
    if (durum && KREDI_DURUMLARI.includes(durum as typeof KREDI_DURUMLARI[number])) {
      query = query.eq('durum', durum)
    }
    
    // Kredi türü filtresi
    if (kredi_turu && KREDI_TURLERI.includes(kredi_turu as typeof KREDI_TURLERI[number])) {
      query = query.eq('kredi_turu', kredi_turu)
    }
    
    // Banka filtresi
    if (banka_id) {
      query = query.eq('banka_id', parseInt(banka_id, 10))
    }
    
    // Sıralama ve pagination
    query = query
      .order('baslangic_tarihi', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    
    const { data: krediler, error, count } = await query
    
    if (error) {
      console.error('Krediler listesi hatası:', error)
      return serverErrorResponse('Krediler yüklenirken hata oluştu')
    }
    
    // Her kredi için taksit özeti hesapla
    if (krediler && krediler.length > 0) {
      const krediIds = krediler.map(k => k.id)
      
      // Tüm taksitleri tek sorguda çek
      const { data: tumTaksitler, error: taksitError } = await supabase
        .from('kredi_taksitler')
        .select('kredi_id, durum, tutar, odenen_tutar')
        .in('kredi_id', krediIds)
      
      if (!taksitError && tumTaksitler) {
        // Kredilere taksit özetlerini ekle
        const taksitMap = new Map<number, typeof tumTaksitler>()
        for (const t of tumTaksitler) {
          if (!taksitMap.has(t.kredi_id)) {
            taksitMap.set(t.kredi_id, [])
          }
          taksitMap.get(t.kredi_id)!.push(t)
        }
        
        for (const kredi of krediler) {
          const taksitler = taksitMap.get(kredi.id) || []
          const odenen = taksitler.filter(t => t.durum === 'odendi')
          const kalan = taksitler.filter(t => t.durum !== 'odendi')
          const geciken = taksitler.filter(t => t.durum === 'gecikti')
          
          ;(kredi as Record<string, unknown>).odenen_taksit_sayisi = odenen.length
          ;(kredi as Record<string, unknown>).kalan_taksit_sayisi = kalan.length
          ;(kredi as Record<string, unknown>).geciken_taksit_sayisi = geciken.length
          ;(kredi as Record<string, unknown>).odenen_toplam = odenen.reduce((sum, t) => sum + (t.odenen_tutar || t.tutar), 0)
          ;(kredi as Record<string, unknown>).kalan_borc = kalan.reduce((sum, t) => sum + t.tutar, 0)
        }
      }
    }
    
    return listResponse(krediler || [], count || 0, page, limit)
    
  } catch (error) {
    if (isAuthError(error)) {
      return error.status === 401 
        ? unauthorizedResponse(error.message)
        : forbiddenResponse(error.message)
    }
    console.error('Krediler GET hatası:', error)
    return serverErrorResponse()
  }
}

/**
 * POST /api/krediler
 * Yeni kredi ekle (taksitler otomatik oluşturulur)
 * 
 * Body:
 * - banka_id: number (opsiyonel)
 * - kredi_turu: string (zorunlu)
 * - anapara: number (zorunlu)
 * - faiz_orani: number (zorunlu)
 * - vade_ay: number (zorunlu)
 * - baslangic_tarihi: string (zorunlu, YYYY-MM-DD)
 * - aylik_taksit?: number (opsiyonel, hesaplanır)
 * - para_birimi?: string (default: 'TRY')
 * - notlar?: string
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    
    const supabase = await createClient()
    const body = await request.json()
    
    // Validasyon
    if (!body.kredi_turu || !KREDI_TURLERI.includes(body.kredi_turu)) {
      return errorResponse('Geçerli bir kredi türü seçiniz')
    }
    
    if (!body.anapara || isNaN(parseFloat(body.anapara)) || parseFloat(body.anapara) <= 0) {
      return errorResponse('Geçerli bir anapara tutarı giriniz')
    }
    
    if (body.faiz_orani === undefined || isNaN(parseFloat(body.faiz_orani)) || parseFloat(body.faiz_orani) < 0) {
      return errorResponse('Geçerli bir faiz oranı giriniz')
    }
    
    if (!body.vade_ay || isNaN(parseInt(body.vade_ay, 10)) || parseInt(body.vade_ay, 10) <= 0) {
      return errorResponse('Geçerli bir vade süresi giriniz')
    }
    
    if (!body.baslangic_tarihi) {
      return errorResponse('Başlangıç tarihi zorunludur')
    }
    
    // Para birimi kontrolü
    const paraBirimi = body.para_birimi || 'TRY'
    if (!PARA_BIRIMLERI.includes(paraBirimi)) {
      return errorResponse('Geçersiz para birimi')
    }
    
    const anapara = parseFloat(body.anapara)
    const faizOrani = parseFloat(body.faiz_orani)
    const vadeAy = parseInt(body.vade_ay, 10)
    
    // Aylık taksit hesapla (kullanıcı vermemişse)
    const aylikTaksit = body.aylik_taksit 
      ? parseFloat(body.aylik_taksit)
      : taksitHesapla(anapara, faizOrani, vadeAy)
    
    const toplamOdeme = Math.round(aylikTaksit * vadeAy * 100) / 100
    
    // Kredi oluştur
    const { data: kredi, error: krediError } = await supabase
      .from('krediler')
      .insert({
        banka_id: body.banka_id || null,
        kredi_turu: body.kredi_turu,
        anapara: anapara,
        faiz_orani: faizOrani,
        vade_ay: vadeAy,
        baslangic_tarihi: body.baslangic_tarihi,
        aylik_taksit: aylikTaksit,
        toplam_odeme: toplamOdeme,
        para_birimi: paraBirimi,
        notlar: body.notlar?.trim() || null,
        durum: 'aktif',
        created_by: user.id
      })
      .select()
      .single()
    
    if (krediError) {
      console.error('Kredi ekleme hatası:', krediError)
      return serverErrorResponse('Kredi eklenirken hata oluştu')
    }
    
    // Taksitleri oluştur
    const taksitler = taksitListesiOlustur(kredi.id, aylikTaksit, vadeAy, body.baslangic_tarihi)
    
    const { error: taksitError } = await supabase
      .from('kredi_taksitler')
      .insert(taksitler)
    
    if (taksitError) {
      console.error('Taksit oluşturma hatası:', taksitError)
      // Kredi oluşturuldu ama taksitler oluşturulamadı - krediyi sil
      await supabase.from('krediler').delete().eq('id', kredi.id)
      return serverErrorResponse('Taksitler oluşturulurken hata oluştu')
    }
    
    // Taksitleri de response'a ekle
    const { data: olusturulanTaksitler } = await supabase
      .from('kredi_taksitler')
      .select('*')
      .eq('kredi_id', kredi.id)
      .order('taksit_no', { ascending: true })
    
    return successResponse({
      ...kredi,
      taksitler: olusturulanTaksitler
    }, 201)
    
  } catch (error) {
    if (isAuthError(error)) {
      return error.status === 401 
        ? unauthorizedResponse(error.message)
        : forbiddenResponse(error.message)
    }
    console.error('Krediler POST hatası:', error)
    return serverErrorResponse()
  }
}
