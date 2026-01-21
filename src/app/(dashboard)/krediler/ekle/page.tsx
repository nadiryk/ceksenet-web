'use client'

// ============================================
// ÇekSenet Web - Kredi Ekleme Sayfası
// ============================================

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Heading } from '@/components/ui/heading'
import { Text } from '@/components/ui/text'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Field, FieldGroup, Label, Description, ErrorMessage } from '@/components/ui/fieldset'
import {
  ArrowLeftIcon,
  BanknotesIcon,
  CalculatorIcon,
  ArrowPathIcon,
} from '@heroicons/react/20/solid'
import { formatCurrency } from '@/lib/utils/format'

// ============================================
// Types
// ============================================

interface KrediFormData {
  banka_id: number | null
  kredi_turu: string
  anapara: string
  faiz_orani: string
  vade_ay: string
  baslangic_tarihi: string
  para_birimi: string
  notlar: string
}

interface FormErrors {
  banka_id?: string
  kredi_turu?: string
  anapara?: string
  faiz_orani?: string
  vade_ay?: string
  baslangic_tarihi?: string
  para_birimi?: string
  notlar?: string
  general?: string
}

// ============================================
// Constants
// ============================================

const KREDI_TURU_LABELS: Record<string, string> = {
  tuketici: 'Tüketici Kredisi',
  konut: 'Konut Kredisi',
  tasit: 'Taşıt Kredisi',
  ticari: 'Ticari Kredi',
  isletme: 'İşletme Kredisi',
  diger: 'Diğer',
}

const PARA_BIRIMI_OPTIONS = [
  { value: 'TRY', label: 'Türk Lirası (₺)', symbol: '₺' },
  { value: 'USD', label: 'Amerikan Doları ($)', symbol: '$' },
  { value: 'EUR', label: 'Euro (€)', symbol: '€' },
  { value: 'GBP', label: 'İngiliz Sterlini (£)', symbol: '£' },
  { value: 'CHF', label: 'İsviçre Frangı (CHF)', symbol: 'CHF' },
]

// ============================================
// Hesaplama Fonksiyonları
// ============================================

function hesaplaTaksit(anapara: number, yillikFaiz: number, vadeAy: number): number {
  const aylikFaiz = yillikFaiz / 100 / 12
  
  // Faizsiz kredi durumu
  if (aylikFaiz === 0) {
    return Math.round((anapara / vadeAy) * 100) / 100
  }
  
  // Anuity formülü: P * [r(1+r)^n] / [(1+r)^n - 1]
  const taksit = anapara * 
    (aylikFaiz * Math.pow(1 + aylikFaiz, vadeAy)) / 
    (Math.pow(1 + aylikFaiz, vadeAy) - 1)
  
  return Math.round(taksit * 100) / 100
}

// ============================================
// Component
// ============================================

export default function KrediEklePage() {
  const router = useRouter()

  // Form state
  const [formData, setFormData] = useState<KrediFormData>({
    banka_id: null,
    kredi_turu: 'tuketici',
    anapara: '',
    faiz_orani: '',
    vade_ay: '',
    baslangic_tarihi: new Date().toISOString().split('T')[0],
    para_birimi: 'TRY',
    notlar: '',
  })

  // UI state
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Banka state
  const [bankalar, setBankalar] = useState<{ id: number; ad: string }[]>([])
  const [isLoadingBankalar, setIsLoadingBankalar] = useState(true)

  // ============================================
  // Load Bankalar
  // ============================================

  useEffect(() => {
    async function loadBankalar() {
      try {
        const response = await fetch('/api/bankalar')
        const result = await response.json()
        if (response.ok) {
          setBankalar(result.data || [])
        }
      } catch (err) {
        console.error('Bankalar yüklenemedi:', err)
      } finally {
        setIsLoadingBankalar(false)
      }
    }
    loadBankalar()
  }, [])

  // ============================================
  // Canlı Hesaplama
  // ============================================

  const hesaplama = useMemo(() => {
    const anapara = parseFloat(formData.anapara)
    const faizOrani = parseFloat(formData.faiz_orani)
    const vadeAy = parseInt(formData.vade_ay)

    // Geçersiz değerler için boş dön
    if (!anapara || anapara <= 0 || isNaN(anapara)) return null
    if (faizOrani === undefined || isNaN(faizOrani) || faizOrani < 0) return null
    if (!vadeAy || vadeAy <= 0 || isNaN(vadeAy)) return null

    const aylikTaksit = hesaplaTaksit(anapara, faizOrani, vadeAy)
    const toplamOdeme = Math.round(aylikTaksit * vadeAy * 100) / 100
    const toplamFaiz = Math.round((toplamOdeme - anapara) * 100) / 100

    return {
      aylikTaksit,
      toplamOdeme,
      toplamFaiz,
    }
  }, [formData.anapara, formData.faiz_orani, formData.vade_ay])

  // ============================================
  // Validation
  // ============================================

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    // Kredi türü
    if (!formData.kredi_turu) {
      newErrors.kredi_turu = 'Kredi türü seçiniz'
    }

    // Anapara
    const anaparaNum = parseFloat(formData.anapara)
    if (!formData.anapara || isNaN(anaparaNum)) {
      newErrors.anapara = 'Geçerli bir anapara tutarı giriniz'
    } else if (anaparaNum <= 0) {
      newErrors.anapara = 'Anapara 0\'dan büyük olmalı'
    }

    // Faiz oranı
    const faizNum = parseFloat(formData.faiz_orani)
    if (formData.faiz_orani === '') {
      newErrors.faiz_orani = 'Faiz oranı giriniz'
    } else if (isNaN(faizNum)) {
      newErrors.faiz_orani = 'Geçerli bir faiz oranı giriniz'
    } else if (faizNum < 0) {
      newErrors.faiz_orani = 'Faiz oranı negatif olamaz'
    } else if (faizNum > 200) {
      newErrors.faiz_orani = 'Faiz oranı %200\'den fazla olamaz'
    }

    // Vade
    const vadeNum = parseInt(formData.vade_ay)
    if (!formData.vade_ay || isNaN(vadeNum)) {
      newErrors.vade_ay = 'Vade süresi giriniz'
    } else if (vadeNum <= 0) {
      newErrors.vade_ay = 'Vade en az 1 ay olmalı'
    } else if (vadeNum > 360) {
      newErrors.vade_ay = 'Vade en fazla 360 ay (30 yıl) olabilir'
    }

    // Başlangıç tarihi
    if (!formData.baslangic_tarihi) {
      newErrors.baslangic_tarihi = 'Başlangıç tarihi seçiniz'
    }

    // Notlar
    if (formData.notlar && formData.notlar.length > 1000) {
      newErrors.notlar = 'Notlar en fazla 1000 karakter olabilir'
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

    if (name === 'banka_id') {
      setFormData(prev => ({
        ...prev,
        banka_id: value ? parseInt(value) : null,
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }))
    }

    // Clear field error on change
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }))
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
      const response = await fetch('/api/krediler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          banka_id: formData.banka_id,
          kredi_turu: formData.kredi_turu,
          anapara: parseFloat(formData.anapara),
          faiz_orani: parseFloat(formData.faiz_orani),
          vade_ay: parseInt(formData.vade_ay),
          baslangic_tarihi: formData.baslangic_tarihi,
          para_birimi: formData.para_birimi,
          notlar: formData.notlar || null,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Kredi oluşturulurken hata oluştu')
      }

      router.push(`/krediler/${result.data.id}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Kredi oluşturulurken bir hata oluştu'
      setErrors({ general: message })
    } finally {
      setIsSubmitting(false)
    }
  }

  // ============================================
  // Helpers
  // ============================================

  const paraBirimiOption = PARA_BIRIMI_OPTIONS.find(p => p.value === formData.para_birimi)
  const paraBirimiSembol = paraBirimiOption?.symbol || '₺'

  // ============================================
  // Render
  // ============================================

  return (
    <div className="mx-auto max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <Button plain onClick={() => router.push('/krediler')} className="mb-4">
          <ArrowLeftIcon className="h-5 w-5" />
          Kredilere Dön
        </Button>
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
            <BanknotesIcon className="h-6 w-6" />
          </div>
          <div>
            <Heading>Yeni Kredi</Heading>
            <Text className="mt-1">Yeni kredi kaydı oluşturun</Text>
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

        {/* Temel Bilgiler */}
        <div className="rounded-lg border border-zinc-200 bg-white p-6">
          <Text className="mb-4 font-medium text-zinc-900">Kredi Bilgileri</Text>
          <FieldGroup>
            {/* Banka & Kredi Türü */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <Field>
                <Label>Banka</Label>
                <Select
                  name="banka_id"
                  value={formData.banka_id || ''}
                  onChange={handleChange}
                  disabled={isLoadingBankalar}
                >
                  <option value="">
                    {isLoadingBankalar ? 'Yükleniyor...' : 'Banka seçiniz (opsiyonel)'}
                  </option>
                  {bankalar.map(banka => (
                    <option key={banka.id} value={banka.id}>
                      {banka.ad}
                    </option>
                  ))}
                </Select>
                {errors.banka_id && <ErrorMessage>{errors.banka_id}</ErrorMessage>}
                <Description>Kredinin alındığı banka</Description>
              </Field>

              <Field>
                <Label>Kredi Türü *</Label>
                <Select
                  name="kredi_turu"
                  value={formData.kredi_turu}
                  onChange={handleChange}
                  invalid={!!errors.kredi_turu}
                >
                  {Object.entries(KREDI_TURU_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
                {errors.kredi_turu && <ErrorMessage>{errors.kredi_turu}</ErrorMessage>}
              </Field>
            </div>

            {/* Para Birimi & Anapara */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <Field>
                <Label>Para Birimi</Label>
                <Select
                  name="para_birimi"
                  value={formData.para_birimi}
                  onChange={handleChange}
                >
                  {PARA_BIRIMI_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
                <Description>Varsayılan: Türk Lirası</Description>
              </Field>

              <Field>
                <Label>Anapara ({paraBirimiSembol}) *</Label>
                <Input
                  name="anapara"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.anapara}
                  onChange={handleChange}
                  placeholder="100000.00"
                  invalid={!!errors.anapara}
                />
                {errors.anapara && <ErrorMessage>{errors.anapara}</ErrorMessage>}
              </Field>
            </div>

            {/* Faiz Oranı & Vade */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <Field>
                <Label>Yıllık Faiz Oranı (%) *</Label>
                <Input
                  name="faiz_orani"
                  type="number"
                  step="0.01"
                  min="0"
                  max="200"
                  value={formData.faiz_orani}
                  onChange={handleChange}
                  placeholder="24.50"
                  invalid={!!errors.faiz_orani}
                />
                {errors.faiz_orani && <ErrorMessage>{errors.faiz_orani}</ErrorMessage>}
                <Description>Yıllık faiz oranı</Description>
              </Field>

              <Field>
                <Label>Vade Süresi (Ay) *</Label>
                <Input
                  name="vade_ay"
                  type="number"
                  step="1"
                  min="1"
                  max="360"
                  value={formData.vade_ay}
                  onChange={handleChange}
                  placeholder="36"
                  invalid={!!errors.vade_ay}
                />
                {errors.vade_ay && <ErrorMessage>{errors.vade_ay}</ErrorMessage>}
              </Field>
            </div>

            {/* Başlangıç Tarihi */}
            <Field>
              <Label>Başlangıç Tarihi *</Label>
              <Input
                name="baslangic_tarihi"
                type="date"
                value={formData.baslangic_tarihi}
                onChange={handleChange}
                invalid={!!errors.baslangic_tarihi}
              />
              {errors.baslangic_tarihi && <ErrorMessage>{errors.baslangic_tarihi}</ErrorMessage>}
              <Description>Kredinin başlangıç tarihi (ilk taksit bu tarihten 1 ay sonra)</Description>
            </Field>

            {/* Notlar */}
            <Field>
              <Label>Notlar</Label>
              <Textarea
                name="notlar"
                value={formData.notlar}
                onChange={handleChange}
                rows={3}
                placeholder="Kredi hakkında ek bilgiler..."
                invalid={!!errors.notlar}
              />
              {errors.notlar && <ErrorMessage>{errors.notlar}</ErrorMessage>}
            </Field>
          </FieldGroup>
        </div>

        {/* Canlı Hesaplama Önizleme */}
        {hesaplama && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-6">
            <div className="mb-4 flex items-center gap-2">
              <CalculatorIcon className="h-5 w-5 text-blue-600" />
              <Text className="font-medium text-blue-900">Hesaplama Önizleme</Text>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <Text className="text-sm text-blue-700">Aylık Taksit</Text>
                <Text className="text-xl font-semibold text-blue-900">
                  {formatCurrency(hesaplama.aylikTaksit, formData.para_birimi)}
                </Text>
              </div>
              <div>
                <Text className="text-sm text-blue-700">Toplam Ödeme</Text>
                <Text className="text-xl font-semibold text-blue-900">
                  {formatCurrency(hesaplama.toplamOdeme, formData.para_birimi)}
                </Text>
              </div>
              <div>
                <Text className="text-sm text-blue-700">Toplam Faiz</Text>
                <Text className="text-xl font-semibold text-blue-900">
                  {formatCurrency(hesaplama.toplamFaiz, formData.para_birimi)}
                </Text>
              </div>
            </div>
            <Text className="mt-4 text-xs text-blue-600">
              * Bu değerler kesin olarak hesaplanacaktır
            </Text>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            outline
            onClick={() => router.push('/krediler')}
            disabled={isSubmitting}
          >
            İptal
          </Button>
          <Button
            type="submit"
            color="blue"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <ArrowPathIcon className="h-5 w-5 animate-spin" />
                Kaydediliyor...
              </>
            ) : (
              'Kredi Ekle'
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
