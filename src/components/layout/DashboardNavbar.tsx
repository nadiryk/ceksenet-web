'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logout } from '@/app/(auth)/logout/actions'
import type { Profile } from '@/lib/auth'

interface DashboardNavbarProps {
  profile: Profile | null
}

export function DashboardNavbar({ profile }: DashboardNavbarProps) {
  const pathname = usePathname()
  const [showUserMenu, setShowUserMenu] = useState(false)

  const navigation = [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Evraklar', href: '/evraklar' },
    { name: 'Cariler', href: '/cariler' },
    { name: 'Krediler', href: '/krediler' },
    { name: 'Raporlar', href: '/raporlar' },
  ]

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard'
    }
    return pathname.startsWith(href)
  }

  return (
    <nav className="bg-white shadow">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between">
          {/* Logo ve Navigation */}
          <div className="flex">
            {/* Logo */}
            <div className="flex shrink-0 items-center">
              <Link href="/dashboard" className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-600">
                  <svg 
                    className="h-5 w-5 text-white" 
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
                <span className="text-lg font-semibold text-gray-900">Çek/Senet</span>
              </Link>
            </div>

            {/* Navigation Links */}
            <div className="hidden sm:ml-8 sm:flex sm:space-x-4">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium ${
                    isActive(item.href)
                      ? 'border-sky-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>

          {/* User Menu */}
          <div className="flex items-center">
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                {/* User Avatar */}
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-100 text-sky-700">
                  {profile?.ad_soyad?.charAt(0).toUpperCase() || 'U'}
                </div>
                <span className="hidden md:block">{profile?.ad_soyad || 'Kullanıcı'}</span>
                {/* Chevron */}
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {showUserMenu && (
                <div className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5">
                  <div className="border-b px-4 py-2">
                    <p className="text-sm font-medium text-gray-900">{profile?.ad_soyad}</p>
                    <p className="text-xs text-gray-500">
                      {profile?.role === 'admin' ? 'Yönetici' : 'Kullanıcı'}
                    </p>
                  </div>
                  
                  {profile?.role === 'admin' && (
                    <Link
                      href="/ayarlar"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setShowUserMenu(false)}
                    >
                      Ayarlar
                    </Link>
                  )}
                  
                  <form action={logout}>
                    <button
                      type="submit"
                      className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-100"
                    >
                      Çıkış Yap
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="sm:hidden">
        <div className="flex space-x-1 overflow-x-auto px-2 pb-3">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium ${
                isActive(item.href)
                  ? 'bg-sky-100 text-sky-700'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
              }`}
            >
              {item.name}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  )
}
