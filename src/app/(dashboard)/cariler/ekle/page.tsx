'use client'

// ============================================
// ÇekSenet Web - Cari Ekleme Sayfası
// ============================================

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Heading } from '@/components/ui/heading'
import { Text } from '@/components/ui/text'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Field, FieldGroup, Label, Description, ErrorMessage } from '@/components/ui/fieldset'
import { ArrowLeftIcon, UserPlusIcon, ArrowPathIcon } from '@heroicons/react/20/solid'

// ============================================
// Types
// ============================================

interface CariFormData {
  ad_soyad: string
  tip: 'musteri' | 'tedarikci'
  telefon: string
  email: string
  adres: string
  vergi_no: string
  notlar: string
}

interface FormErrors {
  ad_soyad?: string
  tip?: string
  telefon?: string
  email?: string
  adres?: string
  vergi_no?: string
  notlar?: string
  general?: string
}

// ============================================
// Component
// ============================================

export default function CariEklePage() {
  const router = useRouter()

  // Form state
  const [formData, setFormData] = useState<CariFormData>({
    ad_soyad: '',
    tip: 'musteri',
    telefon: '',
    email: '',
    adres: '',
    vergi_no: '',
    notlar: '',
  })

  // UI state
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // ============================================
  // Validation
  // ============================================

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    // Ad Soyad
    if (!formData.ad_soyad.trim()) {
      newErrors.ad_soyad = 'Ad soyad / firma adı gerekli'
    } else if (formData.ad_soyad.length < 2) {
      newErrors.ad_soyad = 'En az 2 karakter olmalı'
    } else if (formData.ad_soyad.length > 200) {
      newErrors.ad_soyad = 'En fazla 200 karakter olabilir'
    }

    // Tip
    if (!formData.tip) {
      newErrors.tip = 'Cari tipi seçiniz'
    }

    // Telefon (opsiyonel ama format kontrolü)
    if (formData.telefon && formData.telefon.length > 20) {
      newErrors.telefon = 'En fazla 20 karakter olabilir'
    }

    // Email (opsiyonel ama format kontrolü)
    if (formData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.email)) {
        newErrors.email = 'Geçerli bir e-posta adresi giriniz'
      } else if (formData.email.length > 100) {
        newErrors.email = 'En fazla 100 karakter olabilir'
      }
    }

    // Adres (opsiyonel ama max 500 karakter)
    if (formData.adres && formData.adres.length > 500) {
      newErrors.adres = 'En fazla 500 karakter olabilir'
    }

    // Vergi No (opsiyonel ama max 20 karakter)
    if (formData.vergi_no && formData.vergi_no.length > 20) {
      newErrors.vergi_no = 'En fazla 20 karakter olabilir'
    }

    // Notlar (opsiyonel ama max 1000 karakter)
    if (formData.notlar && formData.notlar.length > 1000) {
      newErrors.notlar = 'En fazla 1000 karakter olabilir'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // ============================================
  // Handlers
  // ============================================

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))

    // Clear field error on change
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    setErrors({})

    try {
      // Boş string'leri null'a çevir (backend için)
      const submitData = {
        ad_soyad: formData.ad_soyad.trim(),
        tip: formData.tip,
        telefon: formData.telefon?.trim() || null,
        email: formData.email?.trim() || null,
        adres: formData.adres?.trim() || null,
        vergi_no: formData.vergi_no?.trim() || null,
        notlar: formData.notlar?.trim() || null,
      }

      const response = await fetch('/api/cariler', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Cari oluşturulurken bir hata oluştu')
      }

      // Başarılı - listeye yönlendir
      router.push('/cariler')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Cari oluşturulurken bir hata oluştu'
      setErrors({ general: message })
    } finally {
      setIsSubmitting(false)
    }
  }

  // ============================================
  // Render
  // ============================================

  return (
    <div className="mx-auto max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <Button plain onClick={() => router.push('/cariler')} className="mb-4">
          <ArrowLeftIcon className="h-5 w-5" />
          Carilere Dön
        </Button>
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
            <UserPlusIcon className="h-6 w-6" />
          </div>
          <div>
            <Heading>Yeni Cari</Heading>
            <Text className="mt-1">Yeni müşteri veya tedarikçi ekleyin</Text>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* General Error */}
        {errors.general && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            {errors.general}
          </div>
        )}

        <div className="rounded-lg border border-zinc-200 bg-white p-6">
          <FieldGroup>
            {/* Ad Soyad & Tip */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <Field>
                <Label>Ad Soyad / Firma Adı *</Label>
                <Input
                  name="ad_soyad"
                  type="text"
                  value={formData.ad_soyad}
                  onChange={handleChange}
                  placeholder="Örn: Ahmet Yılmaz veya ABC Ltd. Şti."
                  invalid={!!errors.ad_soyad}
                />
                {errors.ad_soyad && <ErrorMessage>{errors.ad_soyad}</ErrorMessage>}
              </Field>

              <Field>
                <Label>Cari Tipi *</Label>
                <Select
                  name="tip"
                  value={formData.tip}
                  onChange={handleChange}
                  invalid={!!errors.tip}
                >
                  <option value="musteri">Müşteri</option>
                  <option value="tedarikci">Tedarikçi</option>
                </Select>
                {errors.tip && <ErrorMessage>{errors.tip}</ErrorMessage>}
              </Field>
            </div>

            {/* Telefon & Email */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <Field>
                <Label>Telefon</Label>
                <Input
                  name="telefon"
                  type="tel"
                  value={formData.telefon}
                  onChange={handleChange}
                  placeholder="Örn: 0532 123 45 67"
                  invalid={!!errors.telefon}
                />
                {errors.telefon && <ErrorMessage>{errors.telefon}</ErrorMessage>}
              </Field>

              <Field>
                <Label>E-posta</Label>
                <Input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Örn: info@firma.com"
                  invalid={!!errors.email}
                />
                {errors.email && <ErrorMessage>{errors.email}</ErrorMessage>}
              </Field>
            </div>

            {/* Vergi No */}
            <Field>
              <Label>Vergi No</Label>
              <Input
                name="vergi_no"
                type="text"
                value={formData.vergi_no}
                onChange={handleChange}
                placeholder="Örn: 1234567890"
                invalid={!!errors.vergi_no}
              />
              {errors.vergi_no && <ErrorMessage>{errors.vergi_no}</ErrorMessage>}
              <Description>Şirketler için vergi numarası</Description>
            </Field>

            {/* Adres */}
            <Field>
              <Label>Adres</Label>
              <Textarea
                name="adres"
                value={formData.adres}
                onChange={handleChange}
                rows={2}
                placeholder="Örn: Atatürk Cad. No:123 Kadıköy/İstanbul"
                invalid={!!errors.adres}
              />
              {errors.adres && <ErrorMessage>{errors.adres}</ErrorMessage>}
            </Field>

            {/* Notlar */}
            <Field>
              <Label>Notlar</Label>
              <Textarea
                name="notlar"
                value={formData.notlar}
                onChange={handleChange}
                rows={3}
                placeholder="Cari hakkında ek bilgiler..."
                invalid={!!errors.notlar}
              />
              {errors.notlar && <ErrorMessage>{errors.notlar}</ErrorMessage>}
            </Field>
          </FieldGroup>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            outline
            onClick={() => router.push('/cariler')}
            disabled={isSubmitting}
          >
            İptal
          </Button>
          <Button type="submit" color="emerald" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <ArrowPathIcon className="h-5 w-5 animate-spin" />
                Kaydediliyor...
              </>
            ) : (
              'Cari Ekle'
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
