import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin, isAuthError } from '@/lib/api/auth'
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
 * GET /api/users/[id]
 * Kullanıcı detayı (Admin Only)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin()
    
    const { id } = await params
    
    // UUID format kontrolü
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(id)) {
      return errorResponse('Geçersiz kullanıcı ID')
    }
    
    const supabase = await createClient()
    
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error || !profile) {
      return notFoundResponse('Kullanıcı bulunamadı')
    }
    
    return successResponse(profile)
    
  } catch (error) {
    if (isAuthError(error)) {
      return error.status === 401 
        ? unauthorizedResponse(error.message)
        : forbiddenResponse(error.message)
    }
    console.error('User GET hatası:', error)
    return serverErrorResponse()
  }
}

/**
 * PUT /api/users/[id]
 * Kullanıcı güncelle (Admin Only)
 * 
 * Body:
 * - username?: string
 * - ad_soyad?: string
 * - role?: 'admin' | 'normal'
 * 
 * Not: E-posta ve şifre değişikliği bu endpoint'ten yapılmaz
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const currentUser = await requireAdmin()
    
    const { id } = await params
    
    // UUID format kontrolü
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(id)) {
      return errorResponse('Geçersiz kullanıcı ID')
    }
    
    const supabase = await createClient()
    const body = await request.json()
    
    // Kullanıcı var mı kontrol
    const { data: existing } = await supabase
      .from('profiles')
      .select('id, username, role')
      .eq('id', id)
      .single()
    
    if (!existing) {
      return notFoundResponse('Kullanıcı bulunamadı')
    }
    
    // Kendi rolünü değiştirmeye çalışıyorsa engelle
    if (id === currentUser.id && body.role !== undefined && body.role !== existing.role) {
      return errorResponse('Kendi rolünüzü değiştiremezsiniz')
    }
    
    // Validasyonlar
    if (body.username !== undefined && !body.username.trim()) {
      return errorResponse('Kullanıcı adı boş olamaz')
    }
    
    if (body.ad_soyad !== undefined && !body.ad_soyad.trim()) {
      return errorResponse('Ad Soyad boş olamaz')
    }
    
    if (body.role !== undefined && !['admin', 'normal'].includes(body.role)) {
      return errorResponse('Geçersiz rol (admin/normal)')
    }
    
    // Username değişiyorsa unique kontrolü
    if (body.username && body.username.trim().toLowerCase() !== existing.username) {
      const { data: duplicate } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', body.username.trim().toLowerCase())
        .neq('id', id)
        .single()
      
      if (duplicate) {
        return errorResponse('Bu kullanıcı adı zaten kullanılıyor')
      }
    }
    
    // Update object oluştur
    const updateData: {
      username?: string
      ad_soyad?: string
      role?: 'admin' | 'normal'
    } = {}
    
    if (body.username !== undefined) updateData.username = body.username.trim().toLowerCase()
    if (body.ad_soyad !== undefined) updateData.ad_soyad = body.ad_soyad.trim()
    if (body.role !== undefined) updateData.role = body.role
    
    // Hiçbir şey güncellenmeyecekse
    if (Object.keys(updateData).length === 0) {
      return errorResponse('Güncellenecek alan bulunamadı')
    }
    
    // Update (normal client ile - RLS policies ayarlanmalı)
    const { data, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()
    
    if (error) {
      console.error('Kullanıcı güncelleme hatası:', error)
      return serverErrorResponse('Kullanıcı güncellenirken hata oluştu')
    }
    
    return successResponse(data)
    
  } catch (error) {
    if (isAuthError(error)) {
      return error.status === 401 
        ? unauthorizedResponse(error.message)
        : forbiddenResponse(error.message)
    }
    console.error('User PUT hatası:', error)
    return serverErrorResponse()
  }
}

/**
 * DELETE /api/users/[id]
 * Kullanıcı sil (Admin Only)
 * 
 * Not: 
 * - Kendini silemez
 * - Supabase Auth'dan da siler
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const currentUser = await requireAdmin()
    
    const { id } = await params
    
    // UUID format kontrolü
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(id)) {
      return errorResponse('Geçersiz kullanıcı ID')
    }
    
    // Kendi kendini silmeye çalışıyorsa engelle
    if (id === currentUser.id) {
      return errorResponse('Kendinizi silemezsiniz')
    }
    
    const supabase = await createClient()
    const adminClient = createAdminClient()
    
    // Kullanıcı var mı kontrol
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', id)
      .single()
    
    if (!existing) {
      return notFoundResponse('Kullanıcı bulunamadı')
    }
    
    // Supabase Auth'dan sil (cascade ile profile da silinir)
    const { error: authError } = await adminClient.auth.admin.deleteUser(id)
    
    if (authError) {
      console.error('Auth kullanıcı silme hatası:', authError)
      return serverErrorResponse('Kullanıcı silinirken hata oluştu')
    }
    
    return successResponse({ success: true, message: 'Kullanıcı başarıyla silindi' })
    
  } catch (error) {
    if (isAuthError(error)) {
      return error.status === 401 
        ? unauthorizedResponse(error.message)
        : forbiddenResponse(error.message)
    }
    console.error('User DELETE hatası:', error)
    return serverErrorResponse()
  }
}
