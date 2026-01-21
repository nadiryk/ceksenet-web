'use client'

// ============================================
// ÇekSenet Web - Application Layout
// Main layout with sidebar and navbar
// ============================================

import { usePathname, useRouter } from 'next/navigation'
import Image from 'next/image'
import { useAuth } from '@/lib/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { SidebarLayout } from '@/components/ui/sidebar-layout'
import {
  Sidebar,
  SidebarHeader,
  SidebarBody,
  SidebarFooter,
  SidebarSection,
  SidebarItem,
  SidebarLabel,
  SidebarSpacer,
  SidebarDivider,
} from '@/components/ui/sidebar'
import {
  Navbar,
  NavbarSection,
  NavbarSpacer,
  NavbarItem,
} from '@/components/ui/navbar'
import {
  Dropdown,
  DropdownButton,
  DropdownMenu,
  DropdownItem,
  DropdownDivider,
} from '@/components/ui/dropdown'
import { Avatar } from '@/components/ui/avatar'

// Heroicons
import {
  HomeIcon,
  DocumentTextIcon,
  UsersIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  UserGroupIcon,
  ArrowRightStartOnRectangleIcon,
  UserCircleIcon,
  ChevronDownIcon,
  BanknotesIcon,
} from '@heroicons/react/20/solid'

// ============================================
// Types
// ============================================

interface ApplicationLayoutProps {
  children: React.ReactNode
}

// ============================================
// Main Component
// ============================================

export function ApplicationLayout({ children }: ApplicationLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { profile, isAdmin } = useAuth()

  // Handle logout
  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  // Get user initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <SidebarLayout
      sidebar={
        <AppSidebar
          pathname={pathname}
          isAdmin={isAdmin}
          profile={profile}
          onLogout={handleLogout}
        />
      }
      navbar={
        <AppNavbar
          profile={profile}
          isAdmin={isAdmin}
          onLogout={handleLogout}
          getInitials={getInitials}
        />
      }
    >
      {children}
    </SidebarLayout>
  )
}

// ============================================
// Sidebar Component
// ============================================

interface AppSidebarProps {
  pathname: string
  isAdmin: boolean
  profile: { ad_soyad: string; role: string } | null
  onLogout: () => void
}

function AppSidebar({ pathname, isAdmin, profile, onLogout }: AppSidebarProps) {
  return (
    <Sidebar>
      <SidebarHeader>
        {/* App Logo & Name */}
        <div className="flex items-center gap-2">
          <Image 
            src="/botech-logo.png" 
            alt="Botech" 
            width={28}
            height={28}
            className="h-7 w-auto"
          />
          <div className="flex flex-col">
            <span className="text-sm font-semibold leading-tight text-sidebar-text">
              Çek Senet
            </span>
            <span className="text-xs leading-tight text-sidebar-text-muted">
              Takip Sistemi
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarBody>
        {/* Main Navigation */}
        <SidebarSection>
          <SidebarItem href="/dashboard" current={pathname === '/dashboard'}>
            <HomeIcon data-slot="icon" />
            <SidebarLabel>Dashboard</SidebarLabel>
          </SidebarItem>

          <SidebarItem
            href="/evraklar"
            current={pathname.startsWith('/evraklar')}
          >
            <DocumentTextIcon data-slot="icon" />
            <SidebarLabel>Evraklar</SidebarLabel>
          </SidebarItem>

          <SidebarItem
            href="/cariler"
            current={pathname.startsWith('/cariler')}
          >
            <UsersIcon data-slot="icon" />
            <SidebarLabel>Cariler</SidebarLabel>
          </SidebarItem>

          <SidebarItem
            href="/krediler"
            current={pathname.startsWith('/krediler')}
          >
            <BanknotesIcon data-slot="icon" />
            <SidebarLabel>Krediler</SidebarLabel>
          </SidebarItem>

          <SidebarItem
            href="/raporlar"
            current={pathname.startsWith('/raporlar')}
          >
            <ChartBarIcon data-slot="icon" />
            <SidebarLabel>Raporlar</SidebarLabel>
          </SidebarItem>
        </SidebarSection>

        <SidebarSpacer />

        {/* Settings Section */}
        <SidebarSection>
          <SidebarItem
            href="/ayarlar"
            current={pathname === '/ayarlar'}
          >
            <Cog6ToothIcon data-slot="icon" />
            <SidebarLabel>Ayarlar</SidebarLabel>
          </SidebarItem>

          {/* Admin Only Links */}
          {isAdmin && (
            <SidebarItem
              href="/ayarlar/kullanicilar"
              current={pathname === '/ayarlar/kullanicilar'}
            >
              <UserGroupIcon data-slot="icon" />
              <SidebarLabel>Kullanıcılar</SidebarLabel>
            </SidebarItem>
          )}
        </SidebarSection>
      </SidebarBody>

      <SidebarFooter>
        <SidebarDivider />
        
        {/* User Info */}
        <div className="flex items-center gap-3 px-2 py-1.5">
          <Avatar
            initials={profile?.ad_soyad ? profile.ad_soyad.split(' ').map(n => n[0]).join('').slice(0, 2) : '?'}
            className="size-8 bg-blue-600 text-white"
          />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-sidebar-text">
              {profile?.ad_soyad || 'Kullanıcı'}
            </div>
            <div className="truncate text-xs text-sidebar-text-muted">
              {profile?.role === 'admin' ? 'Yönetici' : 'Kullanıcı'}
            </div>
          </div>
        </div>

        <SidebarSection>
          <SidebarItem href="/ayarlar/profil">
            <UserCircleIcon data-slot="icon" />
            <SidebarLabel>Profil</SidebarLabel>
          </SidebarItem>
          
          <SidebarItem onClick={onLogout}>
            <ArrowRightStartOnRectangleIcon data-slot="icon" />
            <SidebarLabel>Çıkış Yap</SidebarLabel>
          </SidebarItem>
        </SidebarSection>
      </SidebarFooter>
    </Sidebar>
  )
}

// ============================================
// Navbar Component (Mobile)
// ============================================

interface AppNavbarProps {
  profile: { ad_soyad: string; role: string } | null
  isAdmin: boolean
  onLogout: () => void
  getInitials: (name: string) => string
}

function AppNavbar({ profile, isAdmin, onLogout, getInitials }: AppNavbarProps) {
  return (
    <Navbar>
      <NavbarSpacer />

      <NavbarSection>
        {/* User Dropdown */}
        <Dropdown>
          <DropdownButton as={NavbarItem}>
            <Avatar
              initials={profile?.ad_soyad ? getInitials(profile.ad_soyad) : '?'}
              className="size-8 bg-blue-600 text-white"
            />
            <span className="hidden sm:block">{profile?.ad_soyad || 'Kullanıcı'}</span>
            <ChevronDownIcon data-slot="icon" />
          </DropdownButton>

          <DropdownMenu anchor="bottom end">
            <div className="px-3.5 py-1.5 text-xs text-zinc-500 sm:px-3">
              {profile?.role === 'admin' ? 'Yönetici' : 'Kullanıcı'}
            </div>

            <DropdownDivider />

            <DropdownItem href="/ayarlar/profil">
              <UserCircleIcon data-slot="icon" />
              Profil
            </DropdownItem>

            <DropdownItem href="/ayarlar">
              <Cog6ToothIcon data-slot="icon" />
              Ayarlar
            </DropdownItem>

            {isAdmin && (
              <>
                <DropdownDivider />
                <DropdownItem href="/ayarlar/kullanicilar">
                  <UserGroupIcon data-slot="icon" />
                  Kullanıcılar
                </DropdownItem>
              </>
            )}

            <DropdownDivider />

            <DropdownItem onClick={onLogout}>
              <ArrowRightStartOnRectangleIcon data-slot="icon" />
              Çıkış Yap
            </DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </NavbarSection>
    </Navbar>
  )
}

export default ApplicationLayout
