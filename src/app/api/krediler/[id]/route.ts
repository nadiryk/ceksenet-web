import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth, requireAdmin, isAuthError } from '@/lib/api/auth'
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

/**
 * GET /api/krediler/[id]
 * Kredi detayı (taksitlerle birlikte)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth()
    
    const { id } = await params
    const krediId = parseInt(id, 10)
    
    if (isNaN(krediId)) {
      return errorResponse('Geçersiz kredi ID')
    }
    
    const supabase = await createClient()
    
    // Kredi bilgisi (banka ile)
    const { data: kredi, error: krediError } = await supabase
      .from('krediler')
      .select(`
        *,
        banka:bankalar(id, ad)
      `)
      .eq('id', krediId)
      .single()
    
    if (krediError || !kredi) {
      return notFoundResponse('Kredi bulunamadı')
    }
    
    // Taksitleri getir
    const { data: taksitler, error: taksitError } = await supabase
      .from('kredi_taksitler')
      .select('*')
      .eq('kredi_id', krediId)
      .order('taksit_no', { ascending: true })
    
    if (taksitError) {
      console.error('Taksitler getirme hatası:', taksitError)
    }
    
    // Özet hesapla
    const bugun = new Date().toISOString().split('T')[0]
    const taksitListesi = taksitler || []
    
    let odenmisTaksitSayisi = 0
    let kalanTaksitSayisi = 0
    let gecikmisTaksitSayisi = 0
    let odenenTutar = 0
    let kalanBorc = 0
    let gecikmisTutar = 0
    let sonrakiTaksit = null
    
    for (const taksit of taksitListesi) {
      if (taksit.durum === 'odendi') {
        odenmisTaksitSayisi++
        odenenTutar += taksit.odenen_tutar || taksit.tutar
      } else if (taksit.durum === 'gecikti' || (taksit.durum === 'bekliyor' && taksit.vade_tarihi < bugun)) {
        gecikmisTaksitSayisi++
        gecikmisTutar += taksit.tutar
        kalanBorc += taksit.tutar
      } else {
        kalanTaksitSayisi++
        kalanBorc += taksit.tutar
        // İlk bekleyen taksit = sonraki taksit
        if (!sonrakiTaksit && taksit.durum === 'bekliyor') {
          sonrakiTaksit = taksit
        }
      }
    }
    
    const ozet = {
      toplam_taksit: taksitListesi.length,
      odenen_taksit: odenmisTaksitSayisi,
      kalan_taksit: kalanTaksitSayisi,
      geciken_taksit: gecikmisTaksitSayisi,
      odenen_tutar: Math.round(odenenTutar * 100) / 100,
      kalan_borc: Math.round(kalanBorc * 100) / 100,
      geciken_tutar: Math.round(gecikmisTutar * 100) / 100,
      sonraki_taksit: sonrakiTaksit
    }
    
    return successResponse({
      ...kredi,
      taksitler: taksitListesi,
      ozet
    })
    
  } catch (error) {
    if (isAuthError(error)) {
      return error.status === 401 
        ? unauthorizedResponse(error.message)
        : forbiddenResponse(error.message)
    }
    console.error('Kredi detay GET hatası:', error)
    return serverErrorResponse()
  }
}

/**
 * PUT /api/krediler/[id]
 * Kredi güncelle (sadece banka ve notlar güncellenebilir)
 * Anapara, faiz, vade gibi alanlar değiştirilemez (taksitler zaten oluşturulmuş)
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth()
    
    const { id } = await params
    const krediId = parseInt(id, 10)
    
    if (isNaN(krediId)) {
      return errorResponse('Geçersiz kredi ID')
    }
    
    const supabase = await createClient()
    const body = await request.json()
    
    // Kredi var mı kontrol et
    const { data: existing, error: existingError } = await supabase
      .from('krediler')
      .select('id, durum')
      .eq('id', krediId)
      .single()
    
    if (existingError || !existing) {
      return notFoundResponse('Kredi bulunamadı')
    }
    
    // Sadece belirli alanlar güncellenebilir
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    }
    
    // Banka güncellemesi
    if (body.banka_id !== undefined) {
      updateData.banka_id = body.banka_id || null
    }
    
    // Notlar güncellemesi
    if (body.notlar !== undefined) {
      updateData.notlar = body.notlar?.trim() || null
    }
    
    // Güncelle
    const { data: kredi, error: updateError } = await supabase
      .from('krediler')
      .update(updateData)
      .eq('id', krediId)
      .select(`
        *,
        banka:bankalar(id, ad)
      `)
      .single()
    
    if (updateError) {
      console.error('Kredi güncelleme hatası:', updateError)
      return serverErrorResponse('Kredi güncellenirken hata oluştu')
    }
    
    return successResponse(kredi)
    
  } catch (error) {
    if (isAuthError(error)) {
      return error.status === 401 
        ? unauthorizedResponse(error.message)
        : forbiddenResponse(error.message)
    }
    console.error('Kredi PUT hatası:', error)
    return serverErrorResponse()
  }
}

/**
 * DELETE /api/krediler/[id]
 * Kredi sil (sadece admin ve ödemesi yapılmamış krediler)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // Sadece admin silebilir
    await requireAdmin()
    
    const { id } = await params
    const krediId = parseInt(id, 10)
    
    if (isNaN(krediId)) {
      return errorResponse('Geçersiz kredi ID')
    }
    
    const supabase = await createClient()
    
    // Kredi var mı kontrol et
    const { data: existing, error: existingError } = await supabase
      .from('krediler')
      .select('id')
      .eq('id', krediId)
      .single()
    
    if (existingError || !existing) {
      return notFoundResponse('Kredi bulunamadı')
    }
    
    // Ödenmiş taksit var mı kontrol et
    const { data: odenmis, error: odenmiError } = await supabase
      .from('kredi_taksitler')
      .select('id')
      .eq('kredi_id', krediId)
      .eq('durum', 'odendi')
      .limit(1)
    
    if (!odenmiError && odenmis && odenmis.length > 0) {
      return errorResponse('Ödemesi yapılmış kredi silinemez. Önce tüm ödemeleri iptal edin.')
    }
    
    // Önce taksitleri sil (CASCADE yoksa manuel)
    const { error: taksitSilError } = await supabase
      .from('kredi_taksitler')
      .delete()
      .eq('kredi_id', krediId)
    
    if (taksitSilError) {
      console.error('Taksit silme hatası:', taksitSilError)
      return serverErrorResponse('Taksitler silinirken hata oluştu')
    }
    
    // Krediyi sil
    const { error: krediSilError } = await supabase
      .from('krediler')
      .delete()
      .eq('id', krediId)
    
    if (krediSilError) {
      console.error('Kredi silme hatası:', krediSilError)
      return serverErrorResponse('Kredi silinirken hata oluştu')
    }
    
    return successResponse({ 
      success: true, 
      message: 'Kredi başarıyla silindi' 
    })
    
  } catch (error) {
    if (isAuthError(error)) {
      return error.status === 401 
        ? unauthorizedResponse(error.message)
        : forbiddenResponse(error.message)
    }
    console.error('Kredi DELETE hatası:', error)
    return serverErrorResponse()
  }
}
