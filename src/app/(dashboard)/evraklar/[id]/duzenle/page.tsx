'use client'

// ============================================
// ÇekSenet Web - Evrak Düzenleme Sayfası
// ============================================

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { Heading } from '@/components/ui/heading'
import { Text } from '@/components/ui/text'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Field, FieldGroup, Label, Description, ErrorMessage } from '@/components/ui/fieldset'
import { ArrowLeftIcon, PencilSquareIcon, ArrowPathIcon } from '@heroicons/react/20/solid'

// ============================================
// Types
// ============================================

interface Evrak {
  id: number
  evrak_tipi: 'cek' | 'senet'
  evrak_no: string
  tutar: number
  para_birimi: string
  doviz_kuru: number | null
  evrak_tarihi: string | null
  vade_tarihi: string
  banka_id: number | null
  banka_adi: string | null
  kesideci: string | null
  cari_id: number | null
  cari_adi: string | null
  durum: string
  notlar: string | null
  updated_at: string
}

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
  notlar: string
}

interface FormErrors {
  evrak_tipi?: string
  evrak_no?: string
  tutar?: string
  vade_tarihi?: string
  doviz_kuru?: string
  kesideci?: string
  notlar?: string
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

export default function EvrakDuzenlePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { id } = use(params)
  const evrakId = parseInt(id)

  // Original data for reference
  const [originalEvrak, setOriginalEvrak] = useState<Evrak | null>(null)
  const [eskiBankaAdi, setEskiBankaAdi] = useState<string | null>(null)

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
    notlar: '',
  })

  // UI state
  const [errors, setErrors] = useState<FormErrors>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [cariler, setCariler] = useState<Cari[]>([])
  const [bankalar, setBankalar] = useState<Banka[]>([])
  const [isLoadingCariler, setIsLoadingCariler] = useState(true)
  const [isLoadingBankalar, setIsLoadingBankalar] = useState(true)
  const [isLoadingKur, setIsLoadingKur] = useState(false)

  // ============================================
  // Load Evrak Data
  // ============================================

  useEffect(() => {
    async function loadEvrak() {
      if (!evrakId || isNaN(evrakId)) {
        setLoadError('Geçersiz evrak ID')
        setIsLoading(false)
        return
      }

      try {
        const response = await fetch(`/api/evraklar/${evrakId}`)
        if (!response.ok) {
          throw new Error('Evrak bulunamadı')
        }

        const result = await response.json()
        const evrak: Evrak = result.data

        setOriginalEvrak(evrak)

        // Eski evraklarda sadece banka_adi olabilir (geriye uyumluluk)
        if (!evrak.banka_id && evrak.banka_adi) {
          setEskiBankaAdi(evrak.banka_adi)
        }

        // Form verilerini doldur
        setFormData({
          evrak_tipi: evrak.evrak_tipi,
          evrak_no: evrak.evrak_no,
          tutar: evrak.tutar.toString(),
          para_birimi: evrak.para_birimi || 'TRY',
          doviz_kuru: evrak.doviz_kuru,
          evrak_tarihi: evrak.evrak_tarihi || '',
          vade_tarihi: evrak.vade_tarihi,
          banka_id: evrak.banka_id,
          kesideci: evrak.kesideci || '',
          cari_id: evrak.cari_id,
          notlar: evrak.notlar || '',
        })
      } catch (err: any) {
        setLoadError(err?.message || 'Evrak yüklenemedi')
      } finally {
        setIsLoading(false)
      }
    }

    loadEvrak()
  }, [evrakId])

  // ============================================
  // Load Cariler
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

  // ============================================
  // Load Bankalar
  // ============================================

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
    } else if (formData.evrak_no.length > 50) {
      newErrors.evrak_no = 'Evrak no en fazla 50 karakter olabilir'
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

    if (formData.kesideci && formData.kesideci.length > 200) {
      newErrors.kesideci = 'Keşideci en fazla 200 karakter olabilir'
    }

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

    if (name === 'cari_id' || name === 'banka_id') {
      setFormData((prev) => ({
        ...prev,
        [name]: value ? parseInt(value) : null,
      }))
      // Banka seçilince eski banka adı uyarısını kaldır
      if (name === 'banka_id' && value) {
        setEskiBankaAdi(null)
      }
    } else if (name === 'doviz_kuru') {
      setFormData((prev) => ({
        ...prev,
        doviz_kuru: value ? parseFloat(value) : null,
      }))
    } else if (name === 'para_birimi') {
      // Para birimi değişince kuru sıfırla (TRY ise)
      setFormData((prev) => ({
        ...prev,
        para_birimi: value,
        doviz_kuru: value === 'TRY' ? null : prev.doviz_kuru,
      }))
      // Yeni para birimi için kur getir
      if (value !== 'TRY') {
        fetchKur(value)
      }
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
      const response = await fetch(`/api/evraklar/${evrakId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          tutar: parseFloat(formData.tutar),
        }),
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Evrak güncellenemedi')
      }

      router.push(`/evraklar/${evrakId}`)
    } catch (err: any) {
      setErrors({ general: err.message || 'Evrak güncellenirken bir hata oluştu' })
    } finally {
      setIsSubmitting(false)
    }
  }

  // ============================================
  // Loading & Error States
  // ============================================

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <span className="ml-3 text-zinc-600">Evrak yükleniyor...</span>
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6">
          <h3 className="text-lg font-semibold text-red-700">Hata</h3>
          <p className="mt-2 text-red-600">{loadError}</p>
          <Button className="mt-4" onClick={() => router.push('/evraklar')}>
            Evraklara Dön
          </Button>
        </div>
      </div>
    )
  }

  // ============================================
  // Render
  // ============================================

  const isDoviz = formData.para_birimi !== 'TRY'
  const paraBirimiSembol =
    formData.para_birimi === 'USD'
      ? '$'
      : formData.para_birimi === 'EUR'
        ? '€'
        : formData.para_birimi === 'GBP'
          ? '£'
          : '₺'

  return (
    <div className="mx-auto max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <Button plain onClick={() => router.push(`/evraklar/${evrakId}`)} className="mb-4">
          <ArrowLeftIcon className="h-5 w-5" />
          Detaya Dön
        </Button>
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
            <PencilSquareIcon className="h-6 w-6" />
          </div>
          <div>
            <Heading>Evrak Düzenle</Heading>
            <Text className="mt-1">{originalEvrak?.evrak_no}</Text>
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
                {formData.doviz_kuru && !errors.doviz_kuru && (
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
                {eskiBankaAdi && (
                  <Description className="text-amber-600">
                    Eski kayıt: "{eskiBankaAdi}" - Listeden banka seçiniz
                  </Description>
                )}
                {!eskiBankaAdi && <Description>Çekler için banka bilgisi</Description>}
              </Field>

              <Field>
                <Label>Keşideci</Label>
                <Input
                  name="kesideci"
                  type="text"
                  value={formData.kesideci}
                  onChange={handleChange}
                  placeholder="Çeki/senedi veren kişi"
                  invalid={!!errors.kesideci}
                />
                {errors.kesideci && <ErrorMessage>{errors.kesideci}</ErrorMessage>}
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
                <Select name="durum" value={originalEvrak?.durum || 'portfoy'} disabled>
                  {DURUM_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
                <Description>Durum değişikliği için detay sayfasını kullanın</Description>
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
            onClick={() => router.push(`/evraklar/${evrakId}`)}
            disabled={isSubmitting}
          >
            İptal
          </Button>
          <Button type="submit" color="blue" disabled={isSubmitting}>
            {isSubmitting ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
          </Button>
        </div>
      </form>
    </div>
  )
}
