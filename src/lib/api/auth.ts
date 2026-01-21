import { createClient } from '@/lib/supabase/server'
import { Profile } from '@/types/database'

export interface AuthUser {
  id: string
  email: string
  profile: Profile
}

/**
 * API route'larında kullanılmak üzere
 * mevcut kullanıcı bilgisini çeker
 * 
 * @returns AuthUser veya null
 */
export async function getAuthUser(): Promise<AuthUser | null> {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return null
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return null
    }

    return {
      id: user.id,
      email: user.email || '',
      profile,
    }
  } catch {
    return null
  }
}

/**
 * Auth kontrolü yapar
 * Kullanıcı yoksa hata fırlatır
 * 
 * @throws Error - Kullanıcı oturum açmamışsa
 */
export async function requireAuth(): Promise<AuthUser> {
  const user = await getAuthUser()
  
  if (!user) {
    throw new AuthError('Oturum açmanız gerekiyor', 401)
  }
  
  return user
}

/**
 * Admin kontrolü yapar
 * Admin değilse hata fırlatır
 * 
 * @throws Error - Kullanıcı admin değilse
 */
export async function requireAdmin(): Promise<AuthUser> {
  const user = await requireAuth()
  
  if (user.profile.role !== 'admin') {
    throw new AuthError('Bu işlem için admin yetkisi gerekiyor', 403)
  }
  
  return user
}

/**
 * Custom Auth Error class
 */
export class AuthError extends Error {
  status: number
  
  constructor(message: string, status: number) {
    super(message)
    this.name = 'AuthError'
    this.status = status
  }
}

/**
 * Auth error'u handle eder ve uygun response döner
 */
export function isAuthError(error: unknown): error is AuthError {
  return error instanceof AuthError
}
