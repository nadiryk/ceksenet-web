'use client'

import { useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

export interface Profile {
  id: string
  username: string
  ad_soyad: string
  role: 'admin' | 'normal'
  created_at: string
  updated_at?: string
}

export interface AuthState {
  user: User | null
  profile: Profile | null
  loading: boolean
  isAdmin: boolean
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  // Profile'ı API üzerinden çek (RLS sorunlarını atlar)
  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/auth/profile')
      if (response.ok) {
        const result = await response.json()
        if (result.data) {
          setProfile(result.data)
        }
      }
    } catch (error) {
      console.error('Profile fetch error:', error)
    }
  }

  useEffect(() => {
    const supabase = createClient()

    // İlk yükleme - mevcut kullanıcıyı al
    const getInitialSession = async () => {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser()
        setUser(currentUser)

        if (currentUser) {
          // Profile bilgisini API üzerinden çek
          await fetchProfile()
        }
      } catch (error) {
        console.error('Auth error:', error)
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    // Auth state değişikliklerini dinle
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const currentUser = session?.user ?? null
        setUser(currentUser)

        if (currentUser) {
          // Profile bilgisini API üzerinden çek
          await fetchProfile()
        } else {
          setProfile(null)
        }

        setLoading(false)
      }
    )

    // Cleanup
    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return {
    user,
    profile,
    loading,
    isAdmin: profile?.role === 'admin',
  }
}
