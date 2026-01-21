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
 * POST /api/krediler/[id]/erken-odeme
 * Erken/toplu ödeme - kalan tüm taksitleri öde ve krediyi kapat
 * 
 * Body:
 * - odeme_tarihi?: string (default: bugün, YYYY-MM-DD)
 * - notlar?: string (default: 'Erken ödeme')
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth()
    
    const { id } = await params
    const krediId = parseInt(id, 10)
    
    if (isNaN(krediId)) {
      return errorResponse('Geçersiz kredi ID')
    }
    
    const supabase = await createClient()
    const body = await request.json().catch(() => ({}))
    
    // Kredi kontrol
    const { data: kredi, error: krediError } = await supabase
      .from('krediler')
      .select('id, durum, kredi_turu, para_birimi')
      .eq('id', krediId)
      .single()
    
    if (krediError || !kredi) {
      return notFoundResponse('Kredi bulunamadı')
    }
    
    if (kredi.durum !== 'aktif') {
      return errorResponse('Kredi aktif değil, erken ödeme yapılamaz')
    }
    
    // Bekleyen taksitleri getir
    const { data: bekleyenTaksitler, error: taksitError } = await supabase
      .from('kredi_taksitler')
      .select('id, tutar')
      .eq('kredi_id', krediId)
      .in('durum', ['bekliyor', 'gecikti'])
    
    if (taksitError) {
      console.error('Taksit getirme hatası:', taksitError)
      return serverErrorResponse('Taksitler yüklenirken hata oluştu')
    }
    
    if (!bekleyenTaksitler || bekleyenTaksitler.length === 0) {
      return errorResponse('Ödenmemiş taksit bulunamadı')
    }
    
    // Ödeme bilgileri
    const bugun = new Date().toISOString().split('T')[0]
    const odemeTarihi = body.odeme_tarihi || bugun
    const notlar = body.notlar?.trim() || 'Erken ödeme'
    
    // Toplam kalan borç hesapla
    const toplamKalan = bekleyenTaksitler.reduce((sum, t) => sum + t.tutar, 0)
    
    // Tüm bekleyen taksitleri öde
    // Her taksit için odenen_tutar'ı kendi tutar'ına eşitleyerek güncelle
    for (const taksit of bekleyenTaksitler) {
      const { error: updateError } = await supabase
        .from('kredi_taksitler')
        .update({
          durum: 'odendi',
          odeme_tarihi: odemeTarihi,
          odenen_tutar: taksit.tutar,
          notlar: notlar
        })
        .eq('id', taksit.id)
      
      if (updateError) {
        console.error('Taksit güncelleme hatası:', updateError)
        return serverErrorResponse('Taksitler güncellenirken hata oluştu')
      }
    }
    
    // Krediyi erken kapandı olarak işaretle
    const { data: guncelKredi, error: krediUpdateError } = await supabase
      .from('krediler')
      .update({
        durum: 'erken_kapandi',
        updated_at: new Date().toISOString()
      })
      .eq('id', krediId)
      .select()
      .single()
    
    if (krediUpdateError) {
      console.error('Kredi güncelleme hatası:', krediUpdateError)
      return serverErrorResponse('Kredi durumu güncellenirken hata oluştu')
    }
    
    return successResponse({
      kredi: guncelKredi,
      odenen_taksit_sayisi: bekleyenTaksitler.length,
      odenen_tutar: Math.round(toplamKalan * 100) / 100,
      odeme_tarihi: odemeTarihi,
      message: 'Erken ödeme tamamlandı, kredi kapatıldı'
    })
    
  } catch (error) {
    if (isAuthError(error)) {
      return error.status === 401 
        ? unauthorizedResponse(error.message)
        : forbiddenResponse(error.message)
    }
    console.error('Erken ödeme POST hatası:', error)
    return serverErrorResponse()
  }
}
