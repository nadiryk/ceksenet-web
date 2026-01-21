import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin, isAuthError } from '@/lib/api/auth'
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  serverErrorResponse,
} from '@/lib/api/response'

/**
 * GET /api/users
 * Kullanıcı listesi (Admin Only)
 * 
 * Response:
 * {
 *   data: Profile[]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin()
    
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Kullanıcılar listesi hatası:', error)
      return serverErrorResponse('Kullanıcılar yüklenirken hata oluştu')
    }
    
    return successResponse(data || [])
    
  } catch (error) {
    if (isAuthError(error)) {
      return error.status === 401 
        ? unauthorizedResponse(error.message)
        : forbiddenResponse(error.message)
    }
    console.error('Users GET hatası:', error)
    return serverErrorResponse()
  }
}

/**
 * POST /api/users
 * Yeni kullanıcı ekle (Admin Only)
 * 
 * Body:
 * - email: string (zorunlu)
 * - password: string (zorunlu, min 6 karakter)
 * - username: string (zorunlu)
 * - ad_soyad: string (zorunlu)
 * - role: 'admin' | 'normal' (opsiyonel, default: 'normal')
 * 
 * Not: Supabase Auth'a kullanıcı oluşturur ve profiles tablosuna ekler
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin()
    
    const supabase = await createClient()
    const body = await request.json()
    
    // Validasyonlar
    if (!body.email || !body.email.trim()) {
      return errorResponse('E-posta adresi zorunludur')
    }
    
    if (!body.password || body.password.length < 6) {
      return errorResponse('Şifre en az 6 karakter olmalıdır')
    }
    
    if (!body.username || !body.username.trim()) {
      return errorResponse('Kullanıcı adı zorunludur')
    }
    
    if (!body.ad_soyad || !body.ad_soyad.trim()) {
      return errorResponse('Ad Soyad zorunludur')
    }
    
    const email = body.email.trim().toLowerCase()
    const username = body.username.trim().toLowerCase()
    const adSoyad = body.ad_soyad.trim()
    const role: 'admin' | 'normal' = body.role === 'admin' ? 'admin' : 'normal'
    
    // Username unique kontrolü (normal client ile)
    const { data: existingUsername } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .single()
    
    if (existingUsername) {
      return errorResponse('Bu kullanıcı adı zaten kullanılıyor')
    }
    
    // Admin client sadece Auth API için
    const adminClient = createAdminClient()
    
    // Supabase Auth'a kullanıcı oluştur
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password: body.password,
      email_confirm: true, // E-posta doğrulaması gerekmesin
      user_metadata: {
        username,
        ad_soyad: adSoyad,
      },
    })
    
    if (authError) {
      console.error('Auth kullanıcı oluşturma hatası:', authError)
      
      if (authError.message.includes('already been registered')) {
        return errorResponse('Bu e-posta adresi zaten kayıtlı')
      }
      
      return serverErrorResponse('Kullanıcı oluşturulurken hata oluştu')
    }
    
    if (!authData.user) {
      return serverErrorResponse('Kullanıcı oluşturulamadı')
    }
    
    // Profiles tablosuna ekle (normal client ile)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        username,
        ad_soyad: adSoyad,
        role,
      })
      .select()
      .single()
    
    if (profileError) {
      console.error('Profile oluşturma hatası:', profileError)
      
      // Auth kullanıcısını geri sil (rollback)
      await adminClient.auth.admin.deleteUser(authData.user.id)
      
      return serverErrorResponse('Kullanıcı profili oluşturulurken hata oluştu')
    }
    
    return successResponse(profile, 201)
    
  } catch (error) {
    if (isAuthError(error)) {
      return error.status === 401 
        ? unauthorizedResponse(error.message)
        : forbiddenResponse(error.message)
    }
    console.error('Users POST hatası:', error)
    return serverErrorResponse()
  }
}
