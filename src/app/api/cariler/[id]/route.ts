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
import { Database } from '@/types/database'

type CariUpdate = Database['public']['Tables']['cariler']['Update']

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/cariler/[id]
 * Cari detayı (ilişkili evrak sayısı ile)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth()
    
    const { id } = await params
    const cariId = parseInt(id, 10)
    
    if (isNaN(cariId)) {
      return errorResponse('Geçersiz cari ID')
    }
    
    const supabase = await createClient()
    
    // Cari bilgisi
    const { data: cari, error } = await supabase
      .from('cariler')
      .select('*')
      .eq('id', cariId)
      .single()
    
    if (error || !cari) {
      return notFoundResponse('Cari bulunamadı')
    }
    
    // İlişkili evrak sayısı
    const { count: evrakSayisi } = await supabase
      .from('evraklar')
      .select('*', { count: 'exact', head: true })
      .eq('cari_id', cariId)
    
    return successResponse({
      ...cari,
      evrak_sayisi: evrakSayisi || 0,
    })
    
  } catch (error) {
    if (isAuthError(error)) {
      return error.status === 401 
        ? unauthorizedResponse(error.message)
        : forbiddenResponse(error.message)
    }
    console.error('Cari GET hatası:', error)
    return serverErrorResponse()
  }
}

/**
 * PUT /api/cariler/[id]
 * Cari güncelle
 * 
 * Body:
 * - ad_soyad?: string
 * - tip?: 'musteri' | 'tedarikci'
 * - telefon?: string
 * - email?: string
 * - adres?: string
 * - vergi_no?: string
 * - notlar?: string
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth()
    
    const { id } = await params
    const cariId = parseInt(id, 10)
    
    if (isNaN(cariId)) {
      return errorResponse('Geçersiz cari ID')
    }
    
    const supabase = await createClient()
    const body = await request.json()
    
    // Cari var mı kontrol
    const { data: existing } = await supabase
      .from('cariler')
      .select('id')
      .eq('id', cariId)
      .single()
    
    if (!existing) {
      return notFoundResponse('Cari bulunamadı')
    }
    
    // Validasyon
    if (body.ad_soyad !== undefined && !body.ad_soyad.trim()) {
      return errorResponse('Ad Soyad boş olamaz')
    }
    
    if (body.tip !== undefined && !['musteri', 'tedarikci'].includes(body.tip)) {
      return errorResponse('Geçerli bir tip seçiniz (musteri/tedarikci)')
    }
    
    // Update object oluştur (typed)
    const updateData: CariUpdate = {
      updated_at: new Date().toISOString(),
    }
    
    if (body.ad_soyad !== undefined) updateData.ad_soyad = body.ad_soyad.trim()
    if (body.tip !== undefined) updateData.tip = body.tip
    if (body.telefon !== undefined) updateData.telefon = body.telefon?.trim() || null
    if (body.email !== undefined) updateData.email = body.email?.trim() || null
    if (body.adres !== undefined) updateData.adres = body.adres?.trim() || null
    if (body.vergi_no !== undefined) updateData.vergi_no = body.vergi_no?.trim() || null
    if (body.notlar !== undefined) updateData.notlar = body.notlar?.trim() || null
    
    // Update
    const { data, error } = await supabase
      .from('cariler')
      .update(updateData)
      .eq('id', cariId)
      .select()
      .single()
    
    if (error) {
      console.error('Cari güncelleme hatası:', error)
      return serverErrorResponse('Cari güncellenirken hata oluştu')
    }
    
    return successResponse(data)
    
  } catch (error) {
    if (isAuthError(error)) {
      return error.status === 401 
        ? unauthorizedResponse(error.message)
        : forbiddenResponse(error.message)
    }
    console.error('Cari PUT hatası:', error)
    return serverErrorResponse()
  }
}

/**
 * DELETE /api/cariler/[id]
 * Cari sil
 * 
 * Not: İlişkili evrak varsa silme işlemi engellenir
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth()
    
    const { id } = await params
    const cariId = parseInt(id, 10)
    
    if (isNaN(cariId)) {
      return errorResponse('Geçersiz cari ID')
    }
    
    const supabase = await createClient()
    
    // Cari var mı kontrol
    const { data: existing } = await supabase
      .from('cariler')
      .select('id')
      .eq('id', cariId)
      .single()
    
    if (!existing) {
      return notFoundResponse('Cari bulunamadı')
    }
    
    // İlişkili evrak kontrolü
    const { count: evrakSayisi } = await supabase
      .from('evraklar')
      .select('*', { count: 'exact', head: true })
      .eq('cari_id', cariId)
    
    if (evrakSayisi && evrakSayisi > 0) {
      return errorResponse(
        `Bu cariye ait ${evrakSayisi} adet evrak bulunmaktadır. Önce evrakları siliniz veya başka bir cariye aktarınız.`,
        400
      )
    }
    
    // Delete
    const { error } = await supabase
      .from('cariler')
      .delete()
      .eq('id', cariId)
    
    if (error) {
      console.error('Cari silme hatası:', error)
      return serverErrorResponse('Cari silinirken hata oluştu')
    }
    
    return successResponse({ success: true, message: 'Cari başarıyla silindi' })
    
  } catch (error) {
    if (isAuthError(error)) {
      return error.status === 401 
        ? unauthorizedResponse(error.message)
        : forbiddenResponse(error.message)
    }
    console.error('Cari DELETE hatası:', error)
    return serverErrorResponse()
  }
}
