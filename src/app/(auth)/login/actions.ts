'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    // Hata mesajını URL param olarak gönder
    if (error.message === 'Invalid login credentials') {
      redirect('/login?error=invalid')
    } else if (error.message === 'Email not confirmed') {
      redirect('/login?error=unconfirmed')
    } else {
      redirect('/login?error=unknown')
    }
  }

  redirect('/dashboard')
}
