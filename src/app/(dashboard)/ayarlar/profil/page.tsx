'use client'

// ============================================
// ÇekSenet Web - Profil Sayfası
// Kullanıcı profil bilgileri ve şifre değiştirme
// ============================================

import { useState, useEffect } from 'react'
import { Heading, Subheading } from '@/components/ui/heading'
import { Text } from '@/components/ui/text'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Divider } from '@/components/ui/divider'
import { Field, FieldGroup, Label, Description, ErrorMessage } from '@/components/ui/fieldset'
import {
  DescriptionList,
  DescriptionTerm,
  DescriptionDetails,
} from '@/components/ui/description-list'
import {
  UserCircleIcon,
  KeyIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PencilSquareIcon,
} from '@heroicons/react/20/solid'
import { useAuth } from '@/lib/hooks/useAuth'

// ============================================
// Types
// ============================================

interface ProfileFormData {
  ad_soyad: string
}

interface PasswordFormData {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

interface FormErrors {
  ad_soyad?: string
  currentPassword?: string
  newPassword?: string
  confirmPassword?: string
  general?: string
}

// ============================================
// Main Component
// ============================================

export default function ProfilPage() {
  const { user, profile, isAdmin } = useAuth()

  return (
    <div className="space-y-10">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
          <UserCircleIcon className="h-6 w-6" />
        </div>
        <div>
          <Heading>Profil</Heading>
          <Text className="mt-1">Hesap bilgilerinizi görüntüleyin ve düzenleyin</Text>
        </div>
      </div>

      {/* Profil Bilgileri */}
      <ProfileSection user={user} profile={profile} isAdmin={isAdmin} />

      <Divider />

      {/* Profil Düzenleme */}
      <EditProfileSection profile={profile} />

      <Divider />

      {/* Şifre Değiştirme */}
      <PasswordSection />
    </div>
  )
}

// ============================================
// Profile Section (Görüntüleme)
// ============================================

interface ProfileSectionProps {
  user: any
  profile: any
  isAdmin: boolean
}

function ProfileSection({ user, profile, isAdmin }: ProfileSectionProps) {
  const formatDateTime = (dateString: string | undefined) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return date.toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <section>
      <div className="flex items-center gap-3 mb-2">
        <UserCircleIcon className="h-6 w-6 text-blue-600" />
        <Subheading>Profil Bilgileri</Subheading>
      </div>
      <Text className="mb-6">Hesap bilgilerinizi görüntüleyin</Text>

      <div className="max-w-2xl rounded-lg border border-zinc-200 bg-white p-6">
        <DescriptionList>
          <DescriptionTerm>E-posta</DescriptionTerm>
          <DescriptionDetails className="font-medium">{user?.email || '-'}</DescriptionDetails>

          <DescriptionTerm>Ad Soyad</DescriptionTerm>
          <DescriptionDetails>{profile?.ad_soyad || '-'}</DescriptionDetails>

          <DescriptionTerm>Kullanıcı Adı</DescriptionTerm>
          <DescriptionDetails>{profile?.username || '-'}</DescriptionDetails>

          <DescriptionTerm>Rol</DescriptionTerm>
          <DescriptionDetails>
            <Badge color={isAdmin ? 'blue' : 'zinc'}>
              {isAdmin ? 'Yönetici' : 'Kullanıcı'}
            </Badge>
          </DescriptionDetails>

          <DescriptionTerm>Kayıt Tarihi</DescriptionTerm>
          <DescriptionDetails>{formatDateTime(profile?.created_at)}</DescriptionDetails>
        </DescriptionList>
      </div>
    </section>
  )
}

// ============================================
// Edit Profile Section
// ============================================

interface EditProfileSectionProps {
  profile: any
}

function EditProfileSection({ profile }: EditProfileSectionProps) {
  const [formData, setFormData] = useState<ProfileFormData>({
    ad_soyad: '',
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Profile yüklenince formu doldur
  useEffect(() => {
    if (profile) {
      setFormData({
        ad_soyad: profile.ad_soyad || '',
      })
    }
  }, [profile])

  // Validation
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.ad_soyad.trim()) {
      newErrors.ad_soyad = 'Ad Soyad zorunludur'
    } else if (formData.ad_soyad.trim().length < 2) {
      newErrors.ad_soyad = 'Ad Soyad en az 2 karakter olmalıdır'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSuccessMessage(null)
    setErrors({})

    if (!validateForm()) return

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ad_soyad: formData.ad_soyad.trim(),
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        setErrors({ general: result.error || 'Profil güncellenirken hata oluştu' })
        return
      }

      setSuccessMessage('Profil başarıyla güncellendi')
      
      // Sayfayı yenile (profile bilgisi güncellensin)
      setTimeout(() => {
        window.location.reload()
      }, 1500)

    } catch (error) {
      console.error('Profile update error:', error)
      setErrors({ general: 'Bir hata oluştu. Lütfen tekrar deneyin.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section>
      <div className="flex items-center gap-3 mb-2">
        <PencilSquareIcon className="h-6 w-6 text-green-600" />
        <Subheading>Profil Düzenle</Subheading>
      </div>
      <Text className="mb-6">Ad soyad bilginizi güncelleyin</Text>

      <form onSubmit={handleSubmit} className="max-w-md">
        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 flex items-center gap-2 rounded-lg bg-green-50 p-4 text-green-700">
            <CheckCircleIcon className="h-5 w-5 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* General Error */}
        {errors.general && (
          <div className="mb-6 flex items-center gap-2 rounded-lg bg-red-50 p-4 text-red-700">
            <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" />
            <span>{errors.general}</span>
          </div>
        )}

        <FieldGroup>
          <Field>
            <Label>Ad Soyad</Label>
            <Input
              type="text"
              value={formData.ad_soyad}
              onChange={(e) => setFormData({ ...formData, ad_soyad: e.target.value })}
              invalid={!!errors.ad_soyad}
              disabled={isSubmitting}
            />
            {errors.ad_soyad && <ErrorMessage>{errors.ad_soyad}</ErrorMessage>}
          </Field>
        </FieldGroup>

        <div className="mt-6">
          <Button type="submit" color="blue" disabled={isSubmitting}>
            {isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        </div>
      </form>
    </section>
  )
}

// ============================================
// Password Section
// ============================================

function PasswordSection() {
  const [formData, setFormData] = useState<PasswordFormData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Validation
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.currentPassword) {
      newErrors.currentPassword = 'Mevcut şifre zorunludur'
    }

    if (!formData.newPassword) {
      newErrors.newPassword = 'Yeni şifre zorunludur'
    } else if (formData.newPassword.length < 6) {
      newErrors.newPassword = 'Yeni şifre en az 6 karakter olmalıdır'
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Şifre tekrarı zorunludur'
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Şifreler eşleşmiyor'
    }

    if (formData.currentPassword && formData.newPassword && 
        formData.currentPassword === formData.newPassword) {
      newErrors.newPassword = 'Yeni şifre mevcut şifre ile aynı olamaz'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSuccessMessage(null)
    setErrors({})

    if (!validateForm()) return

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_password: formData.currentPassword,
          new_password: formData.newPassword,
          new_password_confirm: formData.confirmPassword,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        setErrors({ general: result.error || 'Şifre değiştirilirken hata oluştu' })
        return
      }

      setSuccessMessage('Şifre başarıyla değiştirildi')
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })

    } catch (error) {
      console.error('Password change error:', error)
      setErrors({ general: 'Bir hata oluştu. Lütfen tekrar deneyin.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section>
      <div className="flex items-center gap-3 mb-2">
        <KeyIcon className="h-6 w-6 text-amber-600" />
        <Subheading>Şifre Değiştir</Subheading>
      </div>
      <Text className="mb-6">Hesap şifrenizi güncelleyin</Text>

      <form onSubmit={handleSubmit} className="max-w-md">
        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 flex items-center gap-2 rounded-lg bg-green-50 p-4 text-green-700">
            <CheckCircleIcon className="h-5 w-5 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* General Error */}
        {errors.general && (
          <div className="mb-6 flex items-center gap-2 rounded-lg bg-red-50 p-4 text-red-700">
            <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" />
            <span>{errors.general}</span>
          </div>
        )}

        <FieldGroup>
          <Field>
            <Label>Mevcut Şifre</Label>
            <Input
              type="password"
              value={formData.currentPassword}
              onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
              invalid={!!errors.currentPassword}
              disabled={isSubmitting}
              autoComplete="current-password"
            />
            {errors.currentPassword && <ErrorMessage>{errors.currentPassword}</ErrorMessage>}
          </Field>

          <Field>
            <Label>Yeni Şifre</Label>
            <Input
              type="password"
              value={formData.newPassword}
              onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
              invalid={!!errors.newPassword}
              disabled={isSubmitting}
              autoComplete="new-password"
            />
            <Description>En az 6 karakter</Description>
            {errors.newPassword && <ErrorMessage>{errors.newPassword}</ErrorMessage>}
          </Field>

          <Field>
            <Label>Yeni Şifre (Tekrar)</Label>
            <Input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              invalid={!!errors.confirmPassword}
              disabled={isSubmitting}
              autoComplete="new-password"
            />
            {errors.confirmPassword && <ErrorMessage>{errors.confirmPassword}</ErrorMessage>}
          </Field>
        </FieldGroup>

        <div className="mt-6">
          <Button type="submit" color="amber" disabled={isSubmitting}>
            {isSubmitting ? 'Değiştiriliyor...' : 'Şifreyi Değiştir'}
          </Button>
        </div>
      </form>
    </section>
  )
}
