'use client'

// ============================================
// ÇekSenet Web - Ayarlar Sayfası
// Profil, Şifre Değiştirme, WhatsApp Ayarları
// ============================================

import { useState, useEffect, useRef } from 'react'
import { Heading, Subheading } from '@/components/ui/heading'
import { Text } from '@/components/ui/text'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
  Cog6ToothIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/20/solid'
import { useAuth } from '@/lib/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'

// ============================================
// Types
// ============================================

interface PasswordFormData {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

interface FormErrors {
  currentPassword?: string
  newPassword?: string
  confirmPassword?: string
  general?: string
}

interface WhatsAppFormData {
  telefon: string
  mesaj: string
}

// ============================================
// Constants
// ============================================

const DEFAULT_WHATSAPP_MESSAGE = `Merhaba,

{evrak_tipi} bilgileri:
Evrak No: {evrak_no}
Tutar: {tutar} {para_birimi}
Vade Tarihi: {vade_tarihi}

Bilgilerinize sunarız.`

const MESSAGE_VARIABLES = [
  { key: '{evrak_no}', label: 'Evrak No', example: 'ABC123' },
  { key: '{tutar}', label: 'Tutar', example: '10.000,00' },
  { key: '{para_birimi}', label: 'Para Birimi', example: 'TRY' },
  { key: '{vade_tarihi}', label: 'Vade Tarihi', example: '15.02.2026' },
  { key: '{evrak_tipi}', label: 'Evrak Tipi', example: 'Çek' },
  { key: '{kesideci}', label: 'Keşideci', example: 'Ahmet Yılmaz' },
  { key: '{cari}', label: 'Cari', example: 'ABC Ltd. Şti.' },
  { key: '{banka}', label: 'Banka', example: 'Ziraat Bankası' },
]

// ============================================
// Main Component
// ============================================

export default function AyarlarPage() {
  const { user, profile, isAdmin } = useAuth()

  return (
    <div className="space-y-10">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600">
          <Cog6ToothIcon className="h-6 w-6" />
        </div>
        <div>
          <Heading>Ayarlar</Heading>
          <Text className="mt-1">Hesap ve uygulama ayarlarını yönetin</Text>
        </div>
      </div>

      {/* Profil Bilgileri */}
      <ProfileSection user={user} profile={profile} isAdmin={isAdmin} />

      <Divider />

      {/* Şifre Değiştirme */}
      <PasswordSection user={user} />

      <Divider />

      {/* WhatsApp Ayarları */}
      <WhatsAppSection />
    </div>
  )
}

// ============================================
// Profile Section
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

        <div className="mt-4 rounded-lg bg-zinc-50 p-3 text-sm text-zinc-600">
          <Text>
            Profil bilgilerinizi değiştirmek için sistem yöneticinize başvurun.
          </Text>
        </div>
      </div>
    </section>
  )
}

// ============================================
// Password Section
// ============================================

interface PasswordSectionProps {
  user: any
}

function PasswordSection({ user }: PasswordSectionProps) {
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
      newErrors.currentPassword = 'Mevcut şifre gerekli'
    }

    if (!formData.newPassword) {
      newErrors.newPassword = 'Yeni şifre gerekli'
    } else if (formData.newPassword.length < 6) {
      newErrors.newPassword = 'Yeni şifre en az 6 karakter olmalı'
    } else if (formData.newPassword === formData.currentPassword) {
      newErrors.newPassword = 'Yeni şifre mevcut şifreden farklı olmalı'
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Şifre tekrarı gerekli'
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Şifreler eşleşmiyor'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))

    // Clear field error on change
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
    }

    // Clear success message on change
    if (successMessage) {
      setSuccessMessage(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    setErrors({})
    setSuccessMessage(null)

    try {
      const supabase = createClient()

      // Önce mevcut şifreyi doğrula
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: formData.currentPassword,
      })

      if (signInError) {
        setErrors({ currentPassword: 'Mevcut şifre yanlış' })
        return
      }

      // Şifreyi güncelle
      const { error: updateError } = await supabase.auth.updateUser({
        password: formData.newPassword,
      })

      if (updateError) {
        throw updateError
      }

      // Formu temizle
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })

      setSuccessMessage('Şifreniz başarıyla değiştirildi.')
    } catch (err: any) {
      const message = err?.message || 'Şifre değiştirilirken bir hata oluştu'
      setErrors({ general: message })
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
      <Text className="mb-6">Hesabınızın şifresini değiştirin</Text>

      <form onSubmit={handleSubmit} className="max-w-md space-y-6">
        {/* Success Message */}
        {successMessage && (
          <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-4 text-green-700">
            <CheckCircleIcon className="h-5 w-5 shrink-0" />
            {successMessage}
          </div>
        )}

        {/* General Error */}
        {errors.general && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            <ExclamationTriangleIcon className="h-5 w-5 shrink-0" />
            {errors.general}
          </div>
        )}

        <FieldGroup>
          <Field>
            <Label>Mevcut Şifre *</Label>
            <Input
              name="currentPassword"
              type="password"
              value={formData.currentPassword}
              onChange={handleChange}
              placeholder="Mevcut şifrenizi girin"
              invalid={!!errors.currentPassword}
            />
            {errors.currentPassword && <ErrorMessage>{errors.currentPassword}</ErrorMessage>}
          </Field>

          <Field>
            <Label>Yeni Şifre *</Label>
            <Input
              name="newPassword"
              type="password"
              value={formData.newPassword}
              onChange={handleChange}
              placeholder="Yeni şifrenizi girin"
              invalid={!!errors.newPassword}
            />
            {errors.newPassword && <ErrorMessage>{errors.newPassword}</ErrorMessage>}
            <Description>En az 6 karakter olmalı</Description>
          </Field>

          <Field>
            <Label>Yeni Şifre (Tekrar) *</Label>
            <Input
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Yeni şifrenizi tekrar girin"
              invalid={!!errors.confirmPassword}
            />
            {errors.confirmPassword && <ErrorMessage>{errors.confirmPassword}</ErrorMessage>}
          </Field>
        </FieldGroup>

        <div className="flex justify-start">
          <Button type="submit" color="blue" disabled={isSubmitting}>
            {isSubmitting ? 'Değiştiriliyor...' : 'Şifreyi Değiştir'}
          </Button>
        </div>
      </form>
    </section>
  )
}

// ============================================
// WhatsApp Section
// ============================================

function WhatsAppSection() {
  const [formData, setFormData] = useState<WhatsAppFormData>({
    telefon: '',
    mesaj: DEFAULT_WHATSAPP_MESSAGE,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Load settings on mount
  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/settings')
      const result = await response.json()

      if (response.ok && result.data) {
        setFormData({
          telefon: result.data.whatsapp_telefon || '',
          mesaj: result.data.whatsapp_mesaj || DEFAULT_WHATSAPP_MESSAGE,
        })
      }
    } catch (err) {
      console.error('Ayarlar yüklenemedi:', err)
    } finally {
      setLoading(false)
    }
  }

  const normalizePhoneNumber = (phone: string): string => {
    // Tüm boşluk, tire, parantez ve + işaretlerini kaldır
    let cleaned = phone.replace(/[\s\-\(\)\+]/g, '')

    // Başındaki 0'ı kaldır ve 90 ekle
    if (cleaned.startsWith('0')) {
      cleaned = '90' + cleaned.substring(1)
    }

    // 90 ile başlamıyorsa ekle
    if (!cleaned.startsWith('90') && cleaned.length === 10) {
      cleaned = '90' + cleaned
    }

    return cleaned
  }

  const isValidPhoneNumber = (phone: string): boolean => {
    const cleaned = normalizePhoneNumber(phone)
    // Türkiye telefon numarası: 90 + 10 hane = 12 hane
    return /^90[0-9]{10}$/.test(cleaned)
  }

  const handleSave = async () => {
    // Validate phone if provided
    if (formData.telefon && !isValidPhoneNumber(formData.telefon)) {
      setError('Geçersiz telefon numarası. Örnek: 905551234567')
      return
    }

    try {
      setSaving(true)
      setError(null)
      setSuccess(false)

      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          whatsapp_telefon: formData.telefon ? normalizePhoneNumber(formData.telefon) : '',
          whatsapp_mesaj: formData.mesaj,
        }),
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Ayarlar kaydedilemedi')
      }

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      console.error('Ayarlar kaydedilemedi:', err)
      setError(err.message || 'Ayarlar kaydedilirken bir hata oluştu.')
    } finally {
      setSaving(false)
    }
  }

  const handleVariableClick = (variable: string) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = formData.mesaj

    const newText = text.substring(0, start) + variable + text.substring(end)
    setFormData((prev) => ({ ...prev, mesaj: newText }))

    // Set cursor position after the inserted variable
    setTimeout(() => {
      textarea.focus()
      const newPos = start + variable.length
      textarea.setSelectionRange(newPos, newPos)
    }, 0)
  }

  const handleReset = () => {
    setFormData((prev) => ({ ...prev, mesaj: DEFAULT_WHATSAPP_MESSAGE }))
  }

  if (loading) {
    return (
      <section>
        <div className="flex items-center gap-3 mb-6">
          <ChatBubbleLeftRightIcon className="h-6 w-6 text-green-600" />
          <Subheading>WhatsApp Ayarları</Subheading>
        </div>
        <div className="animate-pulse space-y-4 max-w-2xl">
          <div className="h-10 bg-zinc-100 rounded-lg" />
          <div className="h-32 bg-zinc-100 rounded-lg" />
        </div>
      </section>
    )
  }

  return (
    <section>
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-2">
        <ChatBubbleLeftRightIcon className="h-6 w-6 text-green-600" />
        <Subheading>WhatsApp Ayarları</Subheading>
      </div>
      <Text className="mb-6">
        Evrak detay sayfasından WhatsApp ile mesaj göndermek için ayarları yapılandırın.
      </Text>

      {/* Alerts */}
      {success && (
        <div className="mb-6 max-w-2xl flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
          <CheckCircleIcon className="h-5 w-5 text-green-600 shrink-0" />
          <div>
            <Text className="font-medium text-green-800">Başarılı</Text>
            <Text className="text-sm text-green-700">Ayarlar kaydedildi.</Text>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 max-w-2xl flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-600 shrink-0" />
          <div>
            <Text className="font-medium text-red-800">Hata</Text>
            <Text className="text-sm text-red-700">{error}</Text>
          </div>
        </div>
      )}

      {/* Form */}
      <div className="max-w-2xl space-y-6">
        <FieldGroup>
          {/* Phone Number */}
          <Field>
            <Label>Telefon Numarası</Label>
            <Description>
              WhatsApp mesajlarının gönderileceği numara. Başında 0 olmadan, ülke kodu ile yazın.
            </Description>
            <Input
              type="tel"
              placeholder="905551234567"
              value={formData.telefon}
              onChange={(e) => setFormData((prev) => ({ ...prev, telefon: e.target.value }))}
            />
            <Text className="mt-1.5 text-xs text-zinc-500">
              Örnek formatlar: 905551234567, +90 555 123 45 67, 05551234567
            </Text>
          </Field>

          {/* Message Template */}
          <Field>
            <Label>Mesaj Şablonu</Label>
            <Description>
              Evrak bilgilerini içeren mesaj şablonu. Değişkenler otomatik olarak doldurulacaktır.
            </Description>
            <Textarea
              ref={textareaRef}
              rows={8}
              value={formData.mesaj}
              onChange={(e) => setFormData((prev) => ({ ...prev, mesaj: e.target.value }))}
            />
          </Field>
        </FieldGroup>

        {/* Variable Helper */}
        <div>
          <Text className="text-sm font-medium text-zinc-700 mb-2">
            Kullanılabilir Değişkenler
          </Text>
          <Text className="text-xs text-zinc-500 mb-3">
            Değişkene tıklayarak mesaj şablonuna ekleyebilirsiniz.
          </Text>
          <div className="flex flex-wrap gap-2">
            {MESSAGE_VARIABLES.map((v) => (
              <button
                key={v.key}
                type="button"
                onClick={() => handleVariableClick(v.key)}
                className="inline-flex items-center gap-1.5 rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-200 transition-colors cursor-pointer"
                title={`Örnek: ${v.example}`}
              >
                <code className="text-blue-600">{v.key}</code>
                <span className="text-zinc-500">- {v.label}</span>
              </button>
            ))}
          </div>
        </div>

        <Divider />

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button color="blue" onClick={handleSave} disabled={saving}>
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
          <Button outline onClick={handleReset} disabled={saving}>
            Varsayılana Sıfırla
          </Button>
        </div>

        {/* Info Note */}
        {!formData.telefon && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
            <div className="flex gap-3">
              <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <Text className="font-medium text-amber-800">Telefon numarası girilmedi</Text>
                <Text className="text-sm text-amber-700 mt-1">
                  WhatsApp butonunun çalışması için bir telefon numarası girmeniz gerekiyor.
                </Text>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
