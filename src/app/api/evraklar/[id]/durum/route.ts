import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth, isAuthError } from '@/lib/api/auth'
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  unauthorizedResponse,
  forbiddenResponse,
  serverErrorResponse,
} from '@/lib/api/response'

interface RouteParams {
  params: Promise<{ id: string }>
}

// Durum geçiş kuralları
const DURUM_GECISLERI: Record<string, string[]> = {
  'portfoy': ['bankada', 'ciro'],
  'bankada': ['tahsil', 'karsiliksiz', 'portfoy'],
  'ciro': ['tahsil', 'karsiliksiz', 'portfoy'],
  'tahsil': [], // Son durum, değiştirilemez
  'karsiliksiz': ['portfoy'], // Tekrar işleme alınabilir
}

// Durum açıklamaları (Türkçe)
const DURUM_ISIMLERI: Record<string, string> = {
  'portfoy': 'Portföy',
  'bankada': 'Bankada',
  'ciro': 'Ciro Edildi',
  'tahsil': 'Tahsil Edildi',
  'karsiliksiz': 'Karşılıksız',
}

/**
 * PATCH /api/evraklar/[id]/durum
 * Evrak durumunu değiştir
 * 
 * Body:
 * - yeni_durum: 'portfoy' | 'bankada' | 'ciro' | 'tahsil' | 'karsiliksiz' (zorunlu)
 * - aciklama?: string (opsiyonel)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth()
    
    const { id } = await params
    const evrakId = parseInt(id, 10)
    
    if (isNaN(evrakId)) {
      return errorResponse('Geçersiz evrak ID')
    }
    
    const supabase = await createClient()
    const body = await request.json()
    
    // Validasyon
    const yeniDurum = body.yeni_durum
    if (!yeniDurum || !['portfoy', 'bankada', 'ciro', 'tahsil', 'karsiliksiz'].includes(yeniDurum)) {
      return errorResponse('Geçerli bir durum seçiniz')
    }
    
    // Mevcut evrakı getir
    const { data: evrak, error: evrakError } = await supabase
      .from('evraklar')
      .select('id, durum, evrak_no')
      .eq('id', evrakId)
      .single()
    
    if (evrakError || !evrak) {
      return notFoundResponse('Evrak bulunamadı')
    }
    
    const eskiDurum = evrak.durum
    
    // Aynı duruma geçiş kontrolü
    if (eskiDurum === yeniDurum) {
      return errorResponse(`Evrak zaten "${DURUM_ISIMLERI[yeniDurum]}" durumunda`)
    }
    
    // Durum geçiş kuralı kontrolü
    const izinliGecisler = DURUM_GECISLERI[eskiDurum] || []
    if (!izinliGecisler.includes(yeniDurum)) {
      if (izinliGecisler.length === 0) {
        return errorResponse(`"${DURUM_ISIMLERI[eskiDurum]}" durumundaki evrakın durumu değiştirilemez`)
      }
      
      const izinliIsimler = izinliGecisler.map(d => DURUM_ISIMLERI[d]).join(', ')
      return errorResponse(
        `"${DURUM_ISIMLERI[eskiDurum]}" durumundan sadece şu durumlara geçilebilir: ${izinliIsimler}`
      )
    }
    
    // Evrak durumunu güncelle
    const { error: updateError } = await supabase
      .from('evraklar')
      .update({
        durum: yeniDurum,
        updated_at: new Date().toISOString()
      })
      .eq('id', evrakId)
    
    if (updateError) {
      console.error('Evrak durum güncelleme hatası:', updateError)
      return serverErrorResponse('Durum güncellenirken hata oluştu')
    }
    
    // Hareket kaydı oluştur
    const { data: hareket, error: hareketError } = await supabase
      .from('evrak_hareketleri')
      .insert({
        evrak_id: evrakId,
        eski_durum: eskiDurum,
        yeni_durum: yeniDurum,
        aciklama: body.aciklama?.trim() || null,
        created_by: user.id
      })
      .select()
      .single()
    
    if (hareketError) {
      console.error('Hareket kaydı hatası:', hareketError)
      // Hareket kaydı hata verse de devam et
    }
    
    // Güncel evrakı getir
    const { data: updatedEvrak } = await supabase
      .from('evraklar')
      .select(`
        *,
        cari:cariler(id, ad_soyad, tip),
        banka:bankalar(id, ad)
      `)
      .eq('id', evrakId)
      .single()
    
    return successResponse({
      evrak: updatedEvrak,
      hareket: hareket || null,
      mesaj: `Durum "${DURUM_ISIMLERI[eskiDurum]}" → "${DURUM_ISIMLERI[yeniDurum]}" olarak güncellendi`
    })
    
  } catch (error) {
    if (isAuthError(error)) {
      return error.status === 401 
        ? unauthorizedResponse(error.message)
        : forbiddenResponse(error.message)
    }
    console.error('Evrak durum PATCH hatası:', error)
    return serverErrorResponse()
  }
}
