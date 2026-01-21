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
import { getKur } from '@/lib/tcmb'

/**
 * GET /api/evraklar
 * Evrak listesi (filtreleme ve sayfalama ile)
 * 
 * Query params:
 * - evrak_tipi: 'cek' | 'senet'
 * - durum: 'portfoy' | 'bankada' | 'ciro' | 'tahsil' | 'karsiliksiz'
 * - cari_id: number
 * - para_birimi: 'TRY' | 'USD' | 'EUR' | 'GBP' | 'CHF'
 * - vade_baslangic: date (YYYY-MM-DD)
 * - vade_bitis: date (YYYY-MM-DD)
 * - search: string (evrak_no, kesideci)
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
    const evrak_tipi = searchParams.get('evrak_tipi')
    const durum = searchParams.get('durum')
    const cari_id = searchParams.get('cari_id')
    const para_birimi = searchParams.get('para_birimi')
    const vade_baslangic = searchParams.get('vade_baslangic')
    const vade_bitis = searchParams.get('vade_bitis')
    const search = searchParams.get('search')
    
    // Query builder - cari ve banka bilgisi ile birlikte
    let query = supabase
      .from('evraklar')
      .select(`
        *,
        cari:cariler(id, ad_soyad, tip),
        banka:bankalar(id, ad)
      `, { count: 'exact' })
    
    // Evrak tipi filtresi
    if (evrak_tipi && ['cek', 'senet'].includes(evrak_tipi)) {
      query = query.eq('evrak_tipi', evrak_tipi)
    }
    
    // Durum filtresi
    if (durum && ['portfoy', 'bankada', 'ciro', 'tahsil', 'karsiliksiz'].includes(durum)) {
      query = query.eq('durum', durum)
    }
    
    // Cari filtresi
    if (cari_id) {
      query = query.eq('cari_id', parseInt(cari_id, 10))
    }
    
    // Para birimi filtresi
    if (para_birimi && ['TRY', 'USD', 'EUR', 'GBP', 'CHF'].includes(para_birimi)) {
      query = query.eq('para_birimi', para_birimi)
    }
    
    // Vade tarihi aralığı
    if (vade_baslangic) {
      query = query.gte('vade_tarihi', vade_baslangic)
    }
    if (vade_bitis) {
      query = query.lte('vade_tarihi', vade_bitis)
    }
    
    // Arama filtresi (evrak_no veya kesideci)
    if (search) {
      query = query.or(`evrak_no.ilike.%${search}%,kesideci.ilike.%${search}%`)
    }
    
    // Sıralama ve pagination
    query = query
      .order('vade_tarihi', { ascending: true })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    
    const { data, error, count } = await query
    
    if (error) {
      console.error('Evraklar listesi hatası:', error)
      return serverErrorResponse('Evraklar yüklenirken hata oluştu')
    }
    
    return listResponse(data || [], count || 0, page, limit)
    
  } catch (error) {
    if (isAuthError(error)) {
      return error.status === 401 
        ? unauthorizedResponse(error.message)
        : forbiddenResponse(error.message)
    }
    console.error('Evraklar GET hatası:', error)
    return serverErrorResponse()
  }
}

/**
 * POST /api/evraklar
 * Yeni evrak ekle
 * 
 * Body:
 * - evrak_tipi: 'cek' | 'senet' (zorunlu)
 * - evrak_no: string (zorunlu)
 * - tutar: number (zorunlu)
 * - vade_tarihi: string (zorunlu, YYYY-MM-DD)
 * - para_birimi?: 'TRY' | 'USD' | 'EUR' | 'GBP' | 'CHF' (default: 'TRY')
 * - doviz_kuru?: number (döviz ise)
 * - evrak_tarihi?: string
 * - banka_id?: number
 * - kesideci?: string
 * - cari_id?: number
 * - durum?: string (default: 'portfoy')
 * - notlar?: string
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    
    const supabase = await createClient()
    const body = await request.json()
    
    // Validasyon
    if (!body.evrak_tipi || !['cek', 'senet'].includes(body.evrak_tipi)) {
      return errorResponse('Geçerli bir evrak tipi seçiniz (cek/senet)')
    }
    
    if (!body.evrak_no || !body.evrak_no.trim()) {
      return errorResponse('Evrak numarası zorunludur')
    }
    
    if (!body.tutar || isNaN(parseFloat(body.tutar)) || parseFloat(body.tutar) <= 0) {
      return errorResponse('Geçerli bir tutar giriniz')
    }
    
    if (!body.vade_tarihi) {
      return errorResponse('Vade tarihi zorunludur')
    }
    
    // Para birimi kontrolü
    const paraBirimi = body.para_birimi || 'TRY'
    if (!['TRY', 'USD', 'EUR', 'GBP', 'CHF'].includes(paraBirimi)) {
      return errorResponse('Geçersiz para birimi')
    }
    
    // Döviz kuru - otomatik çek veya kullanıcının girdiği değeri kullan
    let dovizKuru = body.doviz_kuru || null
    if (paraBirimi !== 'TRY' && !dovizKuru) {
      // TCMB'den güncel kuru çek
      const kur = await getKur(paraBirimi)
      dovizKuru = kur
    }
    
    // Durum kontrolü
    const durum = body.durum || 'portfoy'
    if (!['portfoy', 'bankada', 'ciro', 'tahsil', 'karsiliksiz'].includes(durum)) {
      return errorResponse('Geçersiz durum')
    }
    
    // Evrak oluştur
    const { data: evrak, error: evrakError } = await supabase
      .from('evraklar')
      .insert({
        evrak_tipi: body.evrak_tipi,
        evrak_no: body.evrak_no.trim(),
        tutar: parseFloat(body.tutar),
        para_birimi: paraBirimi,
        doviz_kuru: dovizKuru,
        evrak_tarihi: body.evrak_tarihi || null,
        vade_tarihi: body.vade_tarihi,
        banka_id: body.banka_id || null,
        banka_adi: body.banka_adi?.trim() || null,
        kesideci: body.kesideci?.trim() || null,
        cari_id: body.cari_id || null,
        durum: durum,
        notlar: body.notlar?.trim() || null,
        created_by: user.id
      })
      .select()
      .single()
    
    if (evrakError) {
      console.error('Evrak ekleme hatası:', evrakError)
      return serverErrorResponse('Evrak eklenirken hata oluştu')
    }
    
    // İlk hareket kaydı oluştur
    const { error: hareketError } = await supabase
      .from('evrak_hareketleri')
      .insert({
        evrak_id: evrak.id,
        eski_durum: null,
        yeni_durum: durum,
        aciklama: 'Evrak oluşturuldu',
        created_by: user.id
      })
    
    if (hareketError) {
      console.error('Hareket kaydı hatası:', hareketError)
      // Hareket kaydı hata verse de evrak oluşturuldu, devam et
    }
    
    return successResponse(evrak, 201)
    
  } catch (error) {
    if (isAuthError(error)) {
      return error.status === 401 
        ? unauthorizedResponse(error.message)
        : forbiddenResponse(error.message)
    }
    console.error('Evraklar POST hatası:', error)
    return serverErrorResponse()
  }
}
