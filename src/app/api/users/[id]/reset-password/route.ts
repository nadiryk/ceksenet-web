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
 * POST /api/users/[id]/reset-password
 * Kullanıcı şifresini sıfırla (Admin Only)
 * 
 * Body:
 * - password: string (zorunlu, min 6 karakter)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin()
    
    const { id } = await params
    
    // UUID format kontrolü
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(id)) {
      return errorResponse('Geçersiz kullanıcı ID')
    }
    
    const body = await request.json()
    
    // Validasyon
    if (!body.password || body.password.length < 6) {
      return errorResponse('Şifre en az 6 karakter olmalıdır')
    }
    
    const supabase = await createClient()
    
    // Kullanıcı var mı kontrol
    const { data: existing } = await supabase
      .from('profiles')
      .select('id, username')
      .eq('id', id)
      .single()
    
    if (!existing) {
      return notFoundResponse('Kullanıcı bulunamadı')
    }
    
    // Admin client ile şifre güncelle
    const adminClient = createAdminClient()
    
    const { error: updateError } = await adminClient.auth.admin.updateUserById(
      id,
      { password: body.password }
    )
    
    if (updateError) {
      console.error('Şifre sıfırlama hatası:', updateError)
      return serverErrorResponse('Şifre sıfırlanırken hata oluştu')
    }
    
    return successResponse({ 
      success: true, 
      message: `${existing.username} kullanıcısının şifresi başarıyla sıfırlandı` 
    })
    
  } catch (error) {
    if (isAuthError(error)) {
      return error.status === 401 
        ? unauthorizedResponse(error.message)
        : forbiddenResponse(error.message)
    }
    console.error('Reset password hatası:', error)
    return serverErrorResponse()
  }
}
