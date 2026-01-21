import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth, isAuthError } from '@/lib/api/auth'
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from '@/lib/api/response'

/**
 * GET /api/auth/profile
 * Mevcut kullanıcının profil bilgilerini getir
 */
export async function GET() {
  try {
    const authUser = await requireAuth()
    
    return successResponse({
      id: authUser.id,
      email: authUser.email,
      username: authUser.profile.username,
      ad_soyad: authUser.profile.ad_soyad,
      role: authUser.profile.role,
      created_at: authUser.profile.created_at,
    })
    
  } catch (error) {
    if (isAuthError(error)) {
      return unauthorizedResponse(error.message)
    }
    console.error('Profile GET hatası:', error)
    return serverErrorResponse()
  }
}

/**
 * PUT /api/auth/profile
 * Mevcut kullanıcının profil bilgilerini güncelle
 * 
 * Body:
 * - ad_soyad?: string
 * 
 * Not: Username ve role değişikliği bu endpoint'ten yapılmaz
 * (username değişikliği için admin gerekir)
 */
export async function PUT(request: NextRequest) {
  try {
    const authUser = await requireAuth()
    
    const supabase = await createClient()
    const body = await request.json()
    
    // Validasyonlar
    if (body.ad_soyad !== undefined && !body.ad_soyad.trim()) {
      return errorResponse('Ad Soyad boş olamaz')
    }
    
    // Update object oluştur
    const updateData: {
      ad_soyad?: string
    } = {}
    
    if (body.ad_soyad !== undefined) {
      updateData.ad_soyad = body.ad_soyad.trim()
    }
    
    // Hiçbir şey güncellenmeyecekse
    if (Object.keys(updateData).length === 0) {
      return errorResponse('Güncellenecek alan bulunamadı')
    }
    
    // Update
    const { data, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', authUser.id)
      .select()
      .single()
    
    if (error) {
      console.error('Profil güncelleme hatası:', error)
      return serverErrorResponse('Profil güncellenirken hata oluştu')
    }
    
    return successResponse({
      id: authUser.id,
      email: authUser.email,
      username: data.username,
      ad_soyad: data.ad_soyad,
      role: data.role,
      created_at: data.created_at,
    })
    
  } catch (error) {
    if (isAuthError(error)) {
      return unauthorizedResponse(error.message)
    }
    console.error('Profile PUT hatası:', error)
    return serverErrorResponse()
  }
}
