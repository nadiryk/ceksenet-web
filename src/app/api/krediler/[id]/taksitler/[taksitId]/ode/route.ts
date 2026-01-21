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
  params: Promise<{ id: string; taksitId: string }>
}

/**
 * PATCH /api/krediler/[id]/taksitler/[taksitId]/ode
 * Taksit ödemesi yap
 * 
 * Body:
 * - odeme_tarihi?: string (default: bugün, YYYY-MM-DD)
 * - odenen_tutar?: number (default: taksit tutarı)
 * - notlar?: string
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth()
    
    const { id, taksitId } = await params
    const krediId = parseInt(id, 10)
    const taksitIdNum = parseInt(taksitId, 10)
    
    if (isNaN(krediId) || isNaN(taksitIdNum)) {
      return errorResponse('Geçersiz kredi veya taksit ID')
    }
    
    const supabase = await createClient()
    const body = await request.json().catch(() => ({}))
    
    // Kredi kontrol
    const { data: kredi, error: krediError } = await supabase
      .from('krediler')
      .select('id, durum')
      .eq('id', krediId)
      .single()
    
    if (krediError || !kredi) {
      return notFoundResponse('Kredi bulunamadı')
    }
    
    if (kredi.durum !== 'aktif') {
      return errorResponse('Kredi aktif değil, ödeme yapılamaz')
    }
    
    // Taksit kontrol
    const { data: taksit, error: taksitError } = await supabase
      .from('kredi_taksitler')
      .select('*')
      .eq('id', taksitIdNum)
      .eq('kredi_id', krediId)
      .single()
    
    if (taksitError || !taksit) {
      return notFoundResponse('Taksit bulunamadı')
    }
    
    if (taksit.durum === 'odendi') {
      return errorResponse('Bu taksit zaten ödenmiş')
    }
    
    // Ödeme bilgileri
    const bugun = new Date().toISOString().split('T')[0]
    const odemeTarihi = body.odeme_tarihi || bugun
    const odenenTutar = body.odenen_tutar !== undefined 
      ? parseFloat(body.odenen_tutar) 
      : taksit.tutar
    const notlar = body.notlar?.trim() || null
    
    // Taksiti güncelle
    const { data: guncelTaksit, error: updateError } = await supabase
      .from('kredi_taksitler')
      .update({
        durum: 'odendi',
        odeme_tarihi: odemeTarihi,
        odenen_tutar: odenenTutar,
        notlar: notlar || taksit.notlar
      })
      .eq('id', taksitIdNum)
      .select()
      .single()
    
    if (updateError) {
      console.error('Taksit güncelleme hatası:', updateError)
      return serverErrorResponse('Taksit güncellenirken hata oluştu')
    }
    
    // Tüm taksitler ödendi mi kontrol et
    const { data: kalanTaksitler, error: kalanError } = await supabase
      .from('kredi_taksitler')
      .select('id')
      .eq('kredi_id', krediId)
      .neq('durum', 'odendi')
    
    let krediDurumu = 'aktif'
    
    // Tüm taksitler ödendiyse krediyi kapat
    if (!kalanError && (!kalanTaksitler || kalanTaksitler.length === 0)) {
      const { error: krediUpdateError } = await supabase
        .from('krediler')
        .update({
          durum: 'kapandi',
          updated_at: new Date().toISOString()
        })
        .eq('id', krediId)
      
      if (!krediUpdateError) {
        krediDurumu = 'kapandi'
      }
    }
    
    return successResponse({
      taksit: guncelTaksit,
      kredi_durumu: krediDurumu,
      message: krediDurumu === 'kapandi' 
        ? 'Taksit ödendi ve kredi kapatıldı' 
        : 'Taksit ödemesi kaydedildi'
    })
    
  } catch (error) {
    if (isAuthError(error)) {
      return error.status === 401 
        ? unauthorizedResponse(error.message)
        : forbiddenResponse(error.message)
    }
    console.error('Taksit ödeme PATCH hatası:', error)
    return serverErrorResponse()
  }
}
