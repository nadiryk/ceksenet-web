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

/**
 * GET /api/krediler/[id]/taksitler
 * Belirli kredinin tüm taksitlerini getir
 * 
 * Query params:
 * - durum: 'bekliyor' | 'odendi' | 'gecikti' (opsiyonel filtre)
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
    const { searchParams } = new URL(request.url)
    
    // Durum filtresi (opsiyonel)
    const durumFiltre = searchParams.get('durum')
    
    // Kredi var mı kontrol et
    const { data: kredi, error: krediError } = await supabase
      .from('krediler')
      .select('id, kredi_turu, para_birimi, durum')
      .eq('id', krediId)
      .single()
    
    if (krediError || !kredi) {
      return notFoundResponse('Kredi bulunamadı')
    }
    
    // Taksitleri getir
    let query = supabase
      .from('kredi_taksitler')
      .select('*')
      .eq('kredi_id', krediId)
    
    // Durum filtresi uygula
    if (durumFiltre && ['bekliyor', 'odendi', 'gecikti'].includes(durumFiltre)) {
      query = query.eq('durum', durumFiltre)
    }
    
    // Sırala
    query = query.order('taksit_no', { ascending: true })
    
    const { data: taksitler, error: taksitError } = await query
    
    if (taksitError) {
      console.error('Taksitler getirme hatası:', taksitError)
      return serverErrorResponse('Taksitler yüklenirken hata oluştu')
    }
    
    // Özet hesapla
    const tumTaksitler = taksitler || []
    const odenenler = tumTaksitler.filter(t => t.durum === 'odendi')
    const bekleyenler = tumTaksitler.filter(t => t.durum === 'bekliyor')
    const gecikenler = tumTaksitler.filter(t => t.durum === 'gecikti')
    
    const ozet = {
      toplam_taksit: tumTaksitler.length,
      odenen: odenenler.length,
      bekleyen: bekleyenler.length,
      geciken: gecikenler.length,
      odenen_tutar: odenenler.reduce((sum, t) => sum + (t.odenen_tutar || t.tutar), 0),
      kalan_tutar: [...bekleyenler, ...gecikenler].reduce((sum, t) => sum + t.tutar, 0)
    }
    
    return successResponse({
      data: taksitler || [],
      kredi: {
        id: kredi.id,
        kredi_turu: kredi.kredi_turu,
        para_birimi: kredi.para_birimi,
        durum: kredi.durum
      },
      ozet: {
        ...ozet,
        odenen_tutar: Math.round(ozet.odenen_tutar * 100) / 100,
        kalan_tutar: Math.round(ozet.kalan_tutar * 100) / 100
      }
    })
    
  } catch (error) {
    if (isAuthError(error)) {
      return error.status === 401 
        ? unauthorizedResponse(error.message)
        : forbiddenResponse(error.message)
    }
    console.error('Kredi taksitler GET hatası:', error)
    return serverErrorResponse()
  }
}
