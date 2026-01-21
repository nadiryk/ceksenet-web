import { createClient } from '@supabase/supabase-js'

/**
 * Service Role Key ile Supabase Admin Client
 * 
 * DİKKAT: Bu client sadece server-side'da kullanılmalı!
 * Sadece Auth Admin API işlemleri için (kullanıcı oluşturma, silme)
 * Database işlemleri için normal server client kullanılmalı
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase URL veya Service Role Key tanımlı değil')
  }

  // Database tipi yok - sadece Auth API için kullanılacak
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
