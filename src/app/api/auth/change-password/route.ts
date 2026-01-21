import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth, isAuthError } from '@/lib/api/auth'
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from '@/lib/api/response'

/**
 * PUT /api/auth/change-password
 * Mevcut kullanıcının şifresini değiştir
 * 
 * Body:
 * - current_password: string (zorunlu)
 * - new_password: string (zorunlu, min 6 karakter)
 * - new_password_confirm: string (zorunlu)
 */
export async function PUT(request: NextRequest) {
  try {
    const authUser = await requireAuth()
    
    const body = await request.json()
    
    // Validasyonlar
    if (!body.current_password) {
      return errorResponse('Mevcut şifre zorunludur')
    }
    
    if (!body.new_password) {
      return errorResponse('Yeni şifre zorunludur')
    }
    
    if (body.new_password.length < 6) {
      return errorResponse('Yeni şifre en az 6 karakter olmalıdır')
    }
    
    if (body.new_password !== body.new_password_confirm) {
      return errorResponse('Yeni şifreler eşleşmiyor')
    }
    
    if (body.current_password === body.new_password) {
      return errorResponse('Yeni şifre mevcut şifre ile aynı olamaz')
    }
    
    // Mevcut şifreyi doğrula - kullanıcıyı tekrar giriş yapmayı dene
    const supabase = await createClient()
    
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: authUser.email,
      password: body.current_password,
    })
    
    if (signInError) {
      console.error('Şifre doğrulama hatası:', signInError)
      return errorResponse('Mevcut şifre hatalı')
    }
    
    // Admin client ile şifre değiştir
    const adminClient = createAdminClient()
    
    const { error: updateError } = await adminClient.auth.admin.updateUserById(
      authUser.id,
      { password: body.new_password }
    )
    
    if (updateError) {
      console.error('Şifre güncelleme hatası:', updateError)
      return serverErrorResponse('Şifre değiştirilirken hata oluştu')
    }
    
    return successResponse({ success: true, message: 'Şifre başarıyla değiştirildi' })
    
  } catch (error) {
    if (isAuthError(error)) {
      return unauthorizedResponse(error.message)
    }
    console.error('Change password hatası:', error)
    return serverErrorResponse()
  }
}
