'use client'

// ============================================
// ÇekSenet Web - Evrak Detay Sayfası
// ============================================

import { useEffect, useState, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import { Heading } from '@/components/ui/heading'
import { Text } from '@/components/ui/text'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Divider } from '@/components/ui/divider'
import {
  DescriptionList,
  DescriptionTerm,
  DescriptionDetails,
} from '@/components/ui/description-list'
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeader,
  TableCell,
} from '@/components/ui/table'
import {
  Dialog,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogActions,
} from '@/components/ui/dialog'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  ArrowLeftIcon,
  PencilSquareIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from '@heroicons/react/20/solid'
import { formatCurrency, formatDate, getDurumLabel, getDurumColor, getEvrakTipiLabel } from '@/lib/utils/format'
import EvrakFotograflar from '@/components/evrak/EvrakFotograflar'

// ============================================
// Types
// ============================================

interface EvrakDetay {
  id: number
  evrak_tipi: 'cek' | 'senet'
  evrak_no: string
  tutar: number
  para_birimi: string
  doviz_kuru: number | null
  evrak_tarihi: string | null
  vade_tarihi: string
  durum: string
  kesideci: string | null
  notlar: string | null
  created_at: string
  updated_at: string
  cari?: { id: number; ad_soyad: string; telefon?: string } | null
  banka?: { id: number; ad: string } | null
}

interface EvrakHareket {
  id: number
  eski_durum: string | null
  yeni_durum: string
  aciklama: string | null
  created_at: string
  kullanici_adi?: string
}

interface Fotograf {
  id: number
  evrak_id: number
  dosya_adi: string
  storage_path: string
  dosya_boyutu: number | null
  mime_type: string | null
  url: string | null
  created_at: string
}

type EvrakDurumu = 'portfoy' | 'bankada' | 'ciro' | 'tahsil' | 'karsiliksiz'

// ============================================
// Constants
// ============================================

const DURUM_LABELS: Record<string, string> = {
  portfoy: 'Portföy',
  bankada: 'Bankada',
  ciro: 'Ciro Edildi',
  tahsil: 'Tahsil Edildi',
  karsiliksiz: 'Karşılıksız',
}

// Geçerli durum geçişleri
function getGecerliDurumlar(mevcutDurum: string): EvrakDurumu[] {
  const gecisler: Record<string, EvrakDurumu[]> = {
    portfoy: ['bankada', 'ciro', 'tahsil', 'karsiliksiz'],
    bankada: ['portfoy', 'tahsil', 'karsiliksiz'],
    ciro: ['portfoy', 'tahsil', 'karsiliksiz'],
    tahsil: [],
    karsiliksiz: ['portfoy'],
  }
  return gecisler[mevcutDurum] || []
}

// ============================================
// Component
// ============================================

export default function EvrakDetayPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { id } = use(params)
  const evrakId = Number(id)

  // State
  const [evrak, setEvrak] = useState<EvrakDetay | null>(null)
  const [hareketler, setHareketler] = useState<EvrakHareket[]>([])
  const [fotograflar, setFotograflar] = useState<Fotograf[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Durum değiştirme modal state
  const [isDurumModalOpen, setIsDurumModalOpen] = useState(false)
  const [selectedDurum, setSelectedDurum] = useState<EvrakDurumu | ''>('')
  const [durumAciklama, setDurumAciklama] = useState('')
  const [isDurumUpdating, setIsDurumUpdating] = useState(false)
  const [durumError, setDurumError] = useState<string | null>(null)

  // Geçerli durum geçişleri
  const gecerliDurumlar = evrak ? getGecerliDurumlar(evrak.durum) : []

  // ============================================
  // Data Fetching
  // ============================================

  const fetchFotograflar = useCallback(async () => {
    try {
      const response = await fetch(`/api/evraklar/${evrakId}/fotograflar`)
      if (response.ok) {
        const result = await response.json()
        setFotograflar(result.data || [])
      }
    } catch (err) {
      console.error('Fotoğraf yükleme hatası:', err)
    }
  }, [evrakId])

  const fetchEvrakDetay = useCallback(async () => {
    if (!evrakId || isNaN(evrakId)) {
      setError('Geçersiz evrak ID')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Evrak detayı
      const evrakResponse = await fetch(`/api/evraklar/${evrakId}`)
      if (!evrakResponse.ok) {
        throw new Error('Evrak bulunamadı')
      }
      const evrakResult = await evrakResponse.json()
      setEvrak(evrakResult.data)

      // Hareket geçmişi
      const hareketResponse = await fetch(`/api/evraklar/${evrakId}/gecmis`)
      if (hareketResponse.ok) {
        const hareketResult = await hareketResponse.json()
        setHareketler(hareketResult.data?.hareketler || [])
      }

      // Fotoğraflar
      await fetchFotograflar()

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Evrak yüklenirken hata oluştu')
    } finally {
      setIsLoading(false)
    }
  }, [evrakId, fetchFotograflar])

  useEffect(() => {
    fetchEvrakDetay()
  }, [fetchEvrakDetay])

  // ============================================
  // Durum Değiştirme
  // ============================================

  const handleOpenDurumModal = () => {
    setSelectedDurum('')
    setDurumAciklama('')
    setDurumError(null)
    setIsDurumModalOpen(true)
  }

  const handleCloseDurumModal = () => {
    setIsDurumModalOpen(false)
    setSelectedDurum('')
    setDurumAciklama('')
    setDurumError(null)
  }

  const handleDurumUpdate = async () => {
    if (!selectedDurum || !evrak) return

    setIsDurumUpdating(true)
    setDurumError(null)

    try {
      const response = await fetch(`/api/evraklar/${evrakId}/durum`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          yeni_durum: selectedDurum,
          aciklama: durumAciklama || undefined,
        }),
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Durum güncellenemedi')
      }

      // Sayfayı yeniden yükle
      await fetchEvrakDetay()
      handleCloseDurumModal()
    } catch (err) {
      setDurumError(err instanceof Error ? err.message : 'Durum güncellenirken hata oluştu')
    } finally {
      setIsDurumUpdating(false)
    }
  }

  // ============================================
  // Render Helpers
  // ============================================

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // ============================================
  // Render - Loading
  // ============================================

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <ArrowPathIcon className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    )
  }

  // ============================================
  // Render - Error
  // ============================================

  if (error || !evrak) {
    return (
      <div className="space-y-4">
        <Button outline onClick={() => router.push('/evraklar')}>
          <ArrowLeftIcon className="h-5 w-5" />
          Listeye Dön
        </Button>
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400" />
          <Text className="mt-4 text-red-700">{error || 'Evrak bulunamadı'}</Text>
        </div>
      </div>
    )
  }

  // ============================================
  // Render - Main
  // ============================================

  const paraBirimi = evrak.para_birimi || 'TRY'
  const isDoviz = paraBirimi !== 'TRY'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <Button outline onClick={() => router.push('/evraklar')}>
            <ArrowLeftIcon className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <Heading>{evrak.evrak_no}</Heading>
              <Badge color={getDurumColor(evrak.durum)}>{getDurumLabel(evrak.durum)}</Badge>
              <Badge color={evrak.evrak_tipi === 'cek' ? 'blue' : 'violet'}>
                {getEvrakTipiLabel(evrak.evrak_tipi)}
              </Badge>
            </div>
            <Text className="mt-1">
              {formatCurrency(evrak.tutar, paraBirimi)} • Vade: {formatDate(evrak.vade_tarihi)}
            </Text>
          </div>
        </div>
        <div className="flex gap-2">
          {gecerliDurumlar.length > 0 && (
            <Button color="blue" onClick={handleOpenDurumModal}>
              Durum Değiştir
            </Button>
          )}
          <Button outline onClick={() => router.push(`/evraklar/${evrakId}/duzenle`)}>
            <PencilSquareIcon className="h-5 w-5" />
            Düzenle
          </Button>
        </div>
      </div>

      {/* Evrak Bilgileri */}
      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <Heading level={2} className="text-lg">
          Evrak Bilgileri
        </Heading>
        <Divider className="my-4" />

        <DescriptionList>
          <DescriptionTerm>Evrak No</DescriptionTerm>
          <DescriptionDetails className="font-medium">{evrak.evrak_no}</DescriptionDetails>

          <DescriptionTerm>Evrak Tipi</DescriptionTerm>
          <DescriptionDetails>
            <Badge color={evrak.evrak_tipi === 'cek' ? 'blue' : 'violet'}>
              {getEvrakTipiLabel(evrak.evrak_tipi)}
            </Badge>
          </DescriptionDetails>

          <DescriptionTerm>Para Birimi</DescriptionTerm>
          <DescriptionDetails>{paraBirimi}</DescriptionDetails>

          <DescriptionTerm>Tutar</DescriptionTerm>
          <DescriptionDetails className="text-lg font-semibold text-zinc-900">
            {isDoviz ? (
              <span>
                {formatCurrency(evrak.tutar, paraBirimi)}
                {evrak.doviz_kuru && (
                  <span className="ml-2 text-sm font-normal text-zinc-500">
                    ≈ {formatCurrency(evrak.tutar * evrak.doviz_kuru, 'TRY')}
                  </span>
                )}
              </span>
            ) : (
              formatCurrency(evrak.tutar, 'TRY')
            )}
          </DescriptionDetails>

          {isDoviz && evrak.doviz_kuru && (
            <>
              <DescriptionTerm>Döviz Kuru</DescriptionTerm>
              <DescriptionDetails>
                1 {paraBirimi} = {evrak.doviz_kuru.toLocaleString('tr-TR', { minimumFractionDigits: 4 })} TRY
              </DescriptionDetails>
            </>
          )}

          <DescriptionTerm>Evrak Tarihi</DescriptionTerm>
          <DescriptionDetails>
            {evrak.evrak_tarihi ? formatDate(evrak.evrak_tarihi) : '-'}
          </DescriptionDetails>

          <DescriptionTerm>Vade Tarihi</DescriptionTerm>
          <DescriptionDetails>{formatDate(evrak.vade_tarihi)}</DescriptionDetails>

          {evrak.banka && (
            <>
              <DescriptionTerm>Banka</DescriptionTerm>
              <DescriptionDetails>{evrak.banka.ad}</DescriptionDetails>
            </>
          )}

          <DescriptionTerm>Keşideci</DescriptionTerm>
          <DescriptionDetails>{evrak.kesideci || '-'}</DescriptionDetails>

          {evrak.cari && (
            <>
              <DescriptionTerm>Cari Hesap</DescriptionTerm>
              <DescriptionDetails>
                <button
                  type="button"
                  onClick={() => router.push(`/cariler/${evrak.cari?.id}`)}
                  className="text-blue-600 hover:underline"
                >
                  {evrak.cari.ad_soyad}
                </button>
                {evrak.cari.telefon && (
                  <span className="ml-2 text-zinc-500">({evrak.cari.telefon})</span>
                )}
              </DescriptionDetails>
            </>
          )}

          <DescriptionTerm>Durum</DescriptionTerm>
          <DescriptionDetails>
            <Badge color={getDurumColor(evrak.durum)}>{getDurumLabel(evrak.durum)}</Badge>
          </DescriptionDetails>

          {evrak.notlar && (
            <>
              <DescriptionTerm>Notlar</DescriptionTerm>
              <DescriptionDetails className="whitespace-pre-wrap">{evrak.notlar}</DescriptionDetails>
            </>
          )}

          <DescriptionTerm>Oluşturulma</DescriptionTerm>
          <DescriptionDetails>{formatDateTime(evrak.created_at)}</DescriptionDetails>

          <DescriptionTerm>Son Güncelleme</DescriptionTerm>
          <DescriptionDetails>{formatDateTime(evrak.updated_at)}</DescriptionDetails>
        </DescriptionList>
      </div>

      {/* Fotoğraflar */}
      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <EvrakFotograflar
          evrakId={evrakId}
          fotograflar={fotograflar}
          onRefresh={fetchFotograflar}
        />
      </div>

      {/* Hareket Geçmişi */}
      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <Heading level={2} className="text-lg">
          Hareket Geçmişi
        </Heading>
        <Divider className="my-4" />

        {hareketler.length === 0 ? (
          <div className="py-8 text-center">
            <Text className="text-zinc-500">Henüz hareket kaydı bulunmuyor.</Text>
          </div>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Tarih</TableHeader>
                <TableHeader>Eski Durum</TableHeader>
                <TableHeader>Yeni Durum</TableHeader>
                <TableHeader>Açıklama</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {hareketler.map((hareket) => (
                <TableRow key={hareket.id}>
                  <TableCell className="whitespace-nowrap">
                    {formatDateTime(hareket.created_at)}
                  </TableCell>
                  <TableCell>
                    {hareket.eski_durum ? (
                      <Badge color={getDurumColor(hareket.eski_durum)}>
                        {getDurumLabel(hareket.eski_durum)}
                      </Badge>
                    ) : (
                      <span className="text-zinc-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge color={getDurumColor(hareket.yeni_durum)}>
                      {getDurumLabel(hareket.yeni_durum)}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">{hareket.aciklama || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Durum Değiştirme Modal */}
      <Dialog open={isDurumModalOpen} onClose={handleCloseDurumModal}>
        <DialogTitle>Durum Değiştir</DialogTitle>
        <DialogDescription>Evrak durumunu değiştirmek için yeni durumu seçin.</DialogDescription>

        <DialogBody>
          {durumError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {durumError}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">Mevcut Durum</label>
              <Badge color={getDurumColor(evrak.durum)} className="text-sm">
                {getDurumLabel(evrak.durum)}
              </Badge>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">
                Yeni Durum <span className="text-red-500">*</span>
              </label>
              <Select
                value={selectedDurum}
                onChange={(e) => setSelectedDurum(e.target.value as EvrakDurumu)}
              >
                <option value="">Durum seçin...</option>
                {gecerliDurumlar.map((d) => (
                  <option key={d} value={d}>
                    {DURUM_LABELS[d]}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">
                Açıklama (İsteğe bağlı)
              </label>
              <Textarea
                value={durumAciklama}
                onChange={(e) => setDurumAciklama(e.target.value)}
                placeholder="Durum değişikliği için not ekleyin..."
                rows={3}
              />
            </div>
          </div>
        </DialogBody>

        <DialogActions>
          <Button outline onClick={handleCloseDurumModal} disabled={isDurumUpdating}>
            İptal
          </Button>
          <Button
            color="blue"
            onClick={handleDurumUpdate}
            disabled={!selectedDurum || isDurumUpdating}
          >
            {isDurumUpdating ? (
              <>
                <ArrowPathIcon className="h-5 w-5 animate-spin" />
                Güncelleniyor...
              </>
            ) : (
              <>
                <CheckCircleIcon className="h-5 w-5" />
                Durumu Güncelle
              </>
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}
