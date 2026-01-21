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

type BankaUpdate = Database['public']['Tables']['bankalar']['Update']

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/bankalar/[id]
 * Banka detayı
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth()
    
    const { id } = await params
    const bankaId = parseInt(id, 10)
    
    if (isNaN(bankaId)) {
      return errorResponse('Geçersiz banka ID')
    }
    
    const supabase = await createClient()
    
    // Banka bilgisi
    const { data: banka, error } = await supabase
      .from('bankalar')
      .select('*')
      .eq('id', bankaId)
      .single()
    
    if (error || !banka) {
      return notFoundResponse('Banka bulunamadı')
    }
    
    // Kullanım sayısı (evraklarda)
    const { count: evrakKullanim } = await supabase
      .from('evraklar')
      .select('*', { count: 'exact', head: true })
      .eq('banka_id', bankaId)
    
    // Kullanım sayısı (kredilerde)
    const { count: krediKullanim } = await supabase
      .from('krediler')
      .select('*', { count: 'exact', head: true })
      .eq('banka_id', bankaId)
    
    return successResponse({
      ...banka,
      evrak_kullanim: evrakKullanim || 0,
      kredi_kullanim: krediKullanim || 0,
    })
    
  } catch (error) {
    if (isAuthError(error)) {
      return error.status === 401 
        ? unauthorizedResponse(error.message)
        : forbiddenResponse(error.message)
    }
    console.error('Banka GET hatası:', error)
    return serverErrorResponse()
  }
}

/**
 * PUT /api/bankalar/[id]
 * Banka güncelle
 * 
 * Body:
 * - ad?: string
 * - aktif?: boolean
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth()
    
    const { id } = await params
    const bankaId = parseInt(id, 10)
    
    if (isNaN(bankaId)) {
      return errorResponse('Geçersiz banka ID')
    }
    
    const supabase = await createClient()
    const body = await request.json()
    
    // Banka var mı kontrol
    const { data: existing } = await supabase
      .from('bankalar')
      .select('id, ad')
      .eq('id', bankaId)
      .single()
    
    if (!existing) {
      return notFoundResponse('Banka bulunamadı')
    }
    
    // Validasyon
    if (body.ad !== undefined && !body.ad.trim()) {
      return errorResponse('Banka adı boş olamaz')
    }
    
    // Ad değişiyorsa, aynı isimde başka banka var mı kontrol
    if (body.ad && body.ad.trim().toLowerCase() !== existing.ad.toLowerCase()) {
      const { data: duplicate } = await supabase
        .from('bankalar')
        .select('id')
        .ilike('ad', body.ad.trim())
        .neq('id', bankaId)
        .single()
      
      if (duplicate) {
        return errorResponse('Bu isimde bir banka zaten mevcut')
      }
    }
    
    // Update object oluştur (typed)
    const updateData: BankaUpdate = {}
    
    if (body.ad !== undefined) updateData.ad = body.ad.trim()
    if (body.aktif !== undefined) updateData.aktif = body.aktif
    
    // Hiçbir şey güncellenmeyecekse
    if (Object.keys(updateData).length === 0) {
      return errorResponse('Güncellenecek alan bulunamadı')
    }
    
    // Update
    const { data, error } = await supabase
      .from('bankalar')
      .update(updateData)
      .eq('id', bankaId)
      .select()
      .single()
    
    if (error) {
      console.error('Banka güncelleme hatası:', error)
      return serverErrorResponse('Banka güncellenirken hata oluştu')
    }
    
    return successResponse(data)
    
  } catch (error) {
    if (isAuthError(error)) {
      return error.status === 401 
        ? unauthorizedResponse(error.message)
        : forbiddenResponse(error.message)
    }
    console.error('Banka PUT hatası:', error)
    return serverErrorResponse()
  }
}

/**
 * DELETE /api/bankalar/[id]
 * Banka sil
 * 
 * Not: Kullanımda olan banka silinemez (evrak veya kredi bağlantısı varsa)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth()
    
    const { id } = await params
    const bankaId = parseInt(id, 10)
    
    if (isNaN(bankaId)) {
      return errorResponse('Geçersiz banka ID')
    }
    
    const supabase = await createClient()
    
    // Banka var mı kontrol
    const { data: existing } = await supabase
      .from('bankalar')
      .select('id')
      .eq('id', bankaId)
      .single()
    
    if (!existing) {
      return notFoundResponse('Banka bulunamadı')
    }
    
    // Evrak kullanım kontrolü
    const { count: evrakKullanim } = await supabase
      .from('evraklar')
      .select('*', { count: 'exact', head: true })
      .eq('banka_id', bankaId)
    
    if (evrakKullanim && evrakKullanim > 0) {
      return errorResponse(
        `Bu banka ${evrakKullanim} adet evrakta kullanılmaktadır. Silmek yerine pasif yapabilirsiniz.`,
        400
      )
    }
    
    // Kredi kullanım kontrolü
    const { count: krediKullanim } = await supabase
      .from('krediler')
      .select('*', { count: 'exact', head: true })
      .eq('banka_id', bankaId)
    
    if (krediKullanim && krediKullanim > 0) {
      return errorResponse(
        `Bu banka ${krediKullanim} adet kredide kullanılmaktadır. Silmek yerine pasif yapabilirsiniz.`,
        400
      )
    }
    
    // Delete
    const { error } = await supabase
      .from('bankalar')
      .delete()
      .eq('id', bankaId)
    
    if (error) {
      console.error('Banka silme hatası:', error)
      return serverErrorResponse('Banka silinirken hata oluştu')
    }
    
    return successResponse({ success: true, message: 'Banka başarıyla silindi' })
    
  } catch (error) {
    if (isAuthError(error)) {
      return error.status === 401 
        ? unauthorizedResponse(error.message)
        : forbiddenResponse(error.message)
    }
    console.error('Banka DELETE hatası:', error)
    return serverErrorResponse()
  }
}
