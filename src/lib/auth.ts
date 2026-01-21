import { createClient } from '@/lib/supabase/server'

export interface Profile {
  id: string
  username: string
  ad_soyad: string
  role: 'admin' | 'normal'
  created_at: string
  updated_at: string
}

/**
 * Server component'lerde kullanılmak üzere
 * mevcut kullanıcının profil bilgisini çeker
 */
export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return null
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return profile
}

/**
 * Kullanıcının admin olup olmadığını kontrol eder
 */
export async function isAdmin(): Promise<boolean> {
  const profile = await getProfile()
  return profile?.role === 'admin'
}
