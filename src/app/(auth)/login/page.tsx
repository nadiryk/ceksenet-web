'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { login } from './actions'
import { useFormStatus } from 'react-dom'

function SubmitButton() {
  const { pending } = useFormStatus()
  
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-md bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? 'Giriş yapılıyor...' : 'Giriş Yap'}
    </button>
  )
}

function LoginForm() {
  const searchParams = useSearchParams()
  const errorParam = searchParams.get('error')

  const getErrorMessage = () => {
    switch (errorParam) {
      case 'invalid':
        return 'E-posta veya şifre hatalı'
      case 'unconfirmed':
        return 'E-posta adresi doğrulanmamış'
      case 'unknown':
        return 'Bir hata oluştu. Lütfen tekrar deneyin.'
      default:
        return null
    }
  }

  const errorMessage = getErrorMessage()

  return (
    <form action={login} className="space-y-6">
      {/* Hata Mesajı */}
      {errorMessage && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-600">
          {errorMessage}
        </div>
      )}

      {/* E-posta */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          E-posta
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          placeholder="ornek@email.com"
        />
      </div>

      {/* Şifre */}
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          Şifre
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          placeholder="••••••••"
        />
      </div>

      {/* Giriş Butonu */}
      <SubmitButton />
    </form>
  )
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
        {/* Logo ve Başlık */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-sky-100">
            <svg 
              className="h-8 w-8 text-sky-600" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Çek/Senet Takip</h1>
          <p className="mt-2 text-gray-600">Hesabınıza giriş yapın</p>
        </div>

        {/* Form with Suspense */}
        <Suspense fallback={
          <div className="space-y-6">
            <div className="h-10 w-full animate-pulse rounded-md bg-gray-200" />
            <div className="h-10 w-full animate-pulse rounded-md bg-gray-200" />
            <div className="h-10 w-full animate-pulse rounded-md bg-gray-200" />
          </div>
        }>
          <LoginForm />
        </Suspense>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-gray-500">
          Çek/Senet Takip Sistemi v2.0 - Web
        </p>
      </div>
    </div>
  )
}
