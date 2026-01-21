'use client'

// ============================================
// ÇekSenet Web - Evrak Ekleme Sayfası
// ============================================

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Heading } from '@/components/ui/heading'
import { Text } from '@/components/ui/text'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Field, FieldGroup, Label, Description, ErrorMessage } from '@/components/ui/fieldset'
import { ArrowLeftIcon, DocumentPlusIcon, ArrowPathIcon } from '@heroicons/react/20/solid'

// ============================================
// Types
// ============================================

interface FormData {
  evrak_tipi: 'cek' | 'senet'
  evrak_no: string
  tutar: string
  para_birimi: string
  doviz_kuru: number | null
  evrak_tarihi: string
  vade_tarihi: string
  banka_id: number | null
  kesideci: string
  cari_id: number | null
  durum: string
  notlar: string
}

interface FormErrors {
  evrak_tipi?: string
  evrak_no?: string
  tutar?: string
  vade_tarihi?: string
  doviz_kuru?: string
  general?: string
}

interface Cari {
  id: number
  ad_soyad: string
  tip: string
}

interface Banka {
  id: number
  ad: string
}

// ============================================
// Constants
// ============================================

const EVRAK_TIPI_OPTIONS = [
  { value: 'cek', label: 'Çek' },
  { value: 'senet', label: 'Senet' },
]

const DURUM_OPTIONS = [
  { value: 'portfoy', label: 'Portföy' },
  { value: 'bankada', label: 'Bankada' },
  { value: 'ciro', label: 'Ciro Edildi' },
  { value: 'tahsil', label: 'Tahsil Edildi' },
  { value: 'karsiliksiz', label: 'Karşılıksız' },
]

const PARA_BIRIMI_OPTIONS = [
  { value: 'TRY', label: '₺ Türk Lirası (TRY)' },
  { value: 'USD', label: '$ Amerikan Doları (USD)' },
  { value: 'EUR', label: '€ Euro (EUR)' },
  { value: 'GBP', label: '£ İngiliz Sterlini (GBP)' },
]

// ============================================
// Component
// ============================================

export default function EvrakEklePage() {
  const router = useRouter()

  // Form state
  const [formData, setFormData] = useState<FormData>({
    evrak_tipi: 'cek',
    evrak_no: '',
    tutar: '',
    para_birimi: 'TRY',
    doviz_kuru: null,
    evrak_tarihi: '',
    vade_tarihi: '',
    banka_id: null,
    kesideci: '',
    cari_id: null,
    durum: 'portfoy',
    notlar: '',
  })

  // UI state
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [cariler, setCariler] = useState<Cari[]>([])
  const [bankalar, setBankalar] = useState<Banka[]>([])
  const [isLoadingCariler, setIsLoadingCariler] = useState(true)
  const [isLoadingBankalar, setIsLoadingBankalar] = useState(true)
  const [isLoadingKur, setIsLoadingKur] = useState(false)

  // ============================================
  // Load Initial Data
  // ============================================

  useEffect(() => {
    async function loadCariler() {
      try {
        const response = await fetch('/api/cariler?limit=1000')
        if (response.ok) {
          const result = await response.json()
          setCariler(result.data || [])
        }
      } catch (err) {
        console.error('Cariler yüklenemedi:', err)
      } finally {
        setIsLoadingCariler(false)
      }
    }
    loadCariler()
  }, [])

  useEffect(() => {
    async function loadBankalar() {
      try {
        const response = await fetch('/api/bankalar')
        if (response.ok) {
          const result = await response.json()
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
  // Kur İşlemleri
  // ============================================

  const fetchKur = async (paraBirimi: string) => {
    if (paraBirimi === 'TRY') {
      setFormData((prev) => ({ ...prev, doviz_kuru: null }))
      return
    }

    setIsLoadingKur(true)
    try {
      const response = await fetch(`/api/kurlar/${paraBirimi}`)
      if (response.ok) {
        const result = await response.json()
        if (result.data?.kur) {
          setFormData((prev) => ({ ...prev, doviz_kuru: result.data.kur }))
        }
      }
    } catch (err) {
      console.error('Kur alınamadı:', err)
    } finally {
      setIsLoadingKur(false)
    }
  }

  // Para birimi değiştiğinde kuru otomatik getir
  useEffect(() => {
    if (formData.para_birimi !== 'TRY') {
      fetchKur(formData.para_birimi)
    } else {
      setFormData((prev) => ({ ...prev, doviz_kuru: null }))
    }
  }, [formData.para_birimi])

  // ============================================
  // Validation
  // ============================================

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.evrak_tipi) {
      newErrors.evrak_tipi = 'Evrak tipi seçiniz'
    }

    if (!formData.evrak_no.trim()) {
      newErrors.evrak_no = 'Evrak no gerekli'
    }

    const tutarNum = parseFloat(formData.tutar)
    if (!formData.tutar || isNaN(tutarNum) || tutarNum <= 0) {
      newErrors.tutar = 'Geçerli bir tutar giriniz'
    }

    if (!formData.vade_tarihi) {
      newErrors.vade_tarihi = 'Vade tarihi seçiniz'
    }

    if (formData.para_birimi !== 'TRY') {
      if (!formData.doviz_kuru || formData.doviz_kuru <= 0) {
        newErrors.doviz_kuru = 'Döviz kuru gerekli'
      }
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

    if (name === 'cari_id' || name === 'banka_id') {
      setFormData((prev) => ({
        ...prev,
        [name]: value ? parseInt(value) : null,
      }))
    } else if (name === 'doviz_kuru') {
      setFormData((prev) => ({
        ...prev,
        doviz_kuru: value ? parseFloat(value) : null,
      }))
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }))
    }

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
      const response = await fetch('/api/evraklar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          tutar: parseFloat(formData.tutar),
        }),
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Evrak oluşturulamadı')
      }

      router.push('/evraklar')
    } catch (err: any) {
      setErrors({ general: err.message || 'Evrak oluşturulurken bir hata oluştu' })
    } finally {
      setIsSubmitting(false)
    }
  }

  // ============================================
  // Render
  // ============================================

  const isDoviz = formData.para_birimi !== 'TRY'
  const paraBirimiSembol = formData.para_birimi === 'USD' ? '$' : formData.para_birimi === 'EUR' ? '€' : formData.para_birimi === 'GBP' ? '£' : '₺'

  return (
    <div className="mx-auto max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <Button plain onClick={() => router.push('/evraklar')} className="mb-4">
          <ArrowLeftIcon className="h-5 w-5" />
          Evraklara Dön
        </Button>
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
            <DocumentPlusIcon className="h-6 w-6" />
          </div>
          <div>
            <Heading>Yeni Evrak</Heading>
            <Text className="mt-1">Yeni çek veya senet ekleyin</Text>
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
            {/* Evrak Tipi & Evrak No */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <Field>
                <Label>Evrak Tipi *</Label>
                <Select
                  name="evrak_tipi"
                  value={formData.evrak_tipi}
                  onChange={handleChange}
                  invalid={!!errors.evrak_tipi}
                >
                  {EVRAK_TIPI_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
                {errors.evrak_tipi && <ErrorMessage>{errors.evrak_tipi}</ErrorMessage>}
              </Field>

              <Field>
                <Label>Evrak No *</Label>
                <Input
                  name="evrak_no"
                  type="text"
                  value={formData.evrak_no}
                  onChange={handleChange}
                  placeholder="Örn: ÇK-2025-001"
                  invalid={!!errors.evrak_no}
                />
                {errors.evrak_no && <ErrorMessage>{errors.evrak_no}</ErrorMessage>}
              </Field>
            </div>

            {/* Para Birimi & Tutar */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <Field>
                <Label>Para Birimi</Label>
                <Select name="para_birimi" value={formData.para_birimi} onChange={handleChange}>
                  {PARA_BIRIMI_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
                <Description>Varsayılan: Türk Lirası</Description>
              </Field>

              <Field>
                <Label>Tutar ({paraBirimiSembol}) *</Label>
                <Input
                  name="tutar"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.tutar}
                  onChange={handleChange}
                  placeholder="0.00"
                  invalid={!!errors.tutar}
                />
                {errors.tutar && <ErrorMessage>{errors.tutar}</ErrorMessage>}
              </Field>
            </div>

            {/* Döviz Kuru (sadece döviz seçiliyse) */}
            {isDoviz && (
              <Field>
                <Label>Döviz Kuru (₺) *</Label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      name="doviz_kuru"
                      type="number"
                      step="0.0001"
                      min="0.0001"
                      value={formData.doviz_kuru || ''}
                      onChange={handleChange}
                      placeholder="0.0000"
                      invalid={!!errors.doviz_kuru}
                    />
                  </div>
                  <Button
                    type="button"
                    outline
                    onClick={() => fetchKur(formData.para_birimi)}
                    disabled={isLoadingKur}
                    title="TCMB'den güncel kuru al"
                  >
                    <ArrowPathIcon className={`h-5 w-5 ${isLoadingKur ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
                {errors.doviz_kuru && <ErrorMessage>{errors.doviz_kuru}</ErrorMessage>}
                {formData.doviz_kuru && (
                  <Description>
                    1 {formData.para_birimi} ={' '}
                    {formData.doviz_kuru.toLocaleString('tr-TR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 4,
                    })}{' '}
                    ₺
                  </Description>
                )}
              </Field>
            )}

            {/* Evrak Tarihi & Vade Tarihi */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <Field>
                <Label>Evrak Tarihi</Label>
                <Input
                  name="evrak_tarihi"
                  type="date"
                  value={formData.evrak_tarihi}
                  onChange={handleChange}
                />
                <Description>Evrakın düzenlenme tarihi</Description>
              </Field>

              <Field>
                <Label>Vade Tarihi *</Label>
                <Input
                  name="vade_tarihi"
                  type="date"
                  value={formData.vade_tarihi}
                  onChange={handleChange}
                  invalid={!!errors.vade_tarihi}
                />
                {errors.vade_tarihi && <ErrorMessage>{errors.vade_tarihi}</ErrorMessage>}
              </Field>
            </div>

            {/* Banka & Keşideci */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <Field>
                <Label>Banka</Label>
                <Select
                  name="banka_id"
                  value={formData.banka_id || ''}
                  onChange={handleChange}
                  disabled={isLoadingBankalar}
                >
                  <option value="">{isLoadingBankalar ? 'Yükleniyor...' : 'Banka seçiniz'}</option>
                  {bankalar.map((banka) => (
                    <option key={banka.id} value={banka.id}>
                      {banka.ad}
                    </option>
                  ))}
                </Select>
                <Description>Çekler için banka bilgisi</Description>
              </Field>

              <Field>
                <Label>Keşideci</Label>
                <Input
                  name="kesideci"
                  type="text"
                  value={formData.kesideci}
                  onChange={handleChange}
                  placeholder="Çeki/senedi veren kişi"
                />
              </Field>
            </div>

            {/* Cari & Durum */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <Field>
                <Label>Cari Hesap</Label>
                <Select
                  name="cari_id"
                  value={formData.cari_id || ''}
                  onChange={handleChange}
                  disabled={isLoadingCariler}
                >
                  <option value="">
                    {isLoadingCariler ? 'Yükleniyor...' : 'Cari seçiniz (opsiyonel)'}
                  </option>
                  {cariler.map((cari) => (
                    <option key={cari.id} value={cari.id}>
                      {cari.ad_soyad} ({cari.tip === 'musteri' ? 'Müşteri' : 'Tedarikçi'})
                    </option>
                  ))}
                </Select>
                <Description>İlişkili cari hesap</Description>
              </Field>

              <Field>
                <Label>Durum</Label>
                <Select name="durum" value={formData.durum} onChange={handleChange}>
                  {DURUM_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
                <Description>Varsayılan: Portföy</Description>
              </Field>
            </div>

            {/* Notlar */}
            <Field>
              <Label>Notlar</Label>
              <Textarea
                name="notlar"
                value={formData.notlar}
                onChange={handleChange}
                rows={3}
                placeholder="Evrak hakkında ek bilgiler..."
              />
            </Field>
          </FieldGroup>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button type="button" outline onClick={() => router.push('/evraklar')} disabled={isSubmitting}>
            İptal
          </Button>
          <Button type="submit" color="blue" disabled={isSubmitting}>
            {isSubmitting ? 'Kaydediliyor...' : 'Evrak Ekle'}
          </Button>
        </div>
      </form>
    </div>
  )
}
