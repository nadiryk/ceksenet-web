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
 * PATCH /api/krediler/[id]/taksitler/[taksitId]/iptal
 * Taksit ödemesini iptal et (geri al)
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
    
    // Kredi kontrol
    const { data: kredi, error: krediError } = await supabase
      .from('krediler')
      .select('id, durum')
      .eq('id', krediId)
      .single()
    
    if (krediError || !kredi) {
      return notFoundResponse('Kredi bulunamadı')
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
    
    if (taksit.durum !== 'odendi') {
      return errorResponse('Bu taksit zaten ödenmemiş durumda')
    }
    
    // Vade tarihi geçmiş mi kontrol et
    const bugun = new Date().toISOString().split('T')[0]
    const yeniDurum = taksit.vade_tarihi < bugun ? 'gecikti' : 'bekliyor'
    
    // Taksiti geri al
    const { data: guncelTaksit, error: updateError } = await supabase
      .from('kredi_taksitler')
      .update({
        durum: yeniDurum,
        odeme_tarihi: null,
        odenen_tutar: null
      })
      .eq('id', taksitIdNum)
      .select()
      .single()
    
    if (updateError) {
      console.error('Taksit güncelleme hatası:', updateError)
      return serverErrorResponse('Taksit güncellenirken hata oluştu')
    }
    
    // Kredi kapalıysa tekrar aktif yap
    let krediDurumu = kredi.durum
    if (kredi.durum === 'kapandi' || kredi.durum === 'erken_kapandi') {
      const { error: krediUpdateError } = await supabase
        .from('krediler')
        .update({
          durum: 'aktif',
          updated_at: new Date().toISOString()
        })
        .eq('id', krediId)
      
      if (!krediUpdateError) {
        krediDurumu = 'aktif'
      }
    }
    
    return successResponse({
      taksit: guncelTaksit,
      kredi_durumu: krediDurumu,
      message: 'Taksit ödemesi iptal edildi'
    })
    
  } catch (error) {
    if (isAuthError(error)) {
      return error.status === 401 
        ? unauthorizedResponse(error.message)
        : forbiddenResponse(error.message)
    }
    console.error('Taksit iptal PATCH hatası:', error)
    return serverErrorResponse()
  }
}
