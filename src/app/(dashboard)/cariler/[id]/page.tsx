'use client'

// ============================================
// ÇekSenet Web - Cari Detay Sayfası
// ============================================

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
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
import {
  ArrowLeftIcon,
  PencilSquareIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  TrashIcon,
  DocumentTextIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  IdentificationIcon,
} from '@heroicons/react/20/solid'
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  getCariTipLabel,
  getCariTipColor,
  getDurumLabel,
  getDurumColor,
  getEvrakTipiLabel,
} from '@/lib/utils/format'

// ============================================
// Types
// ============================================

interface Cari {
  id: number
  ad_soyad: string
  tip: 'musteri' | 'tedarikci'
  telefon: string | null
  email: string | null
  vergi_no: string | null
  adres: string | null
  notlar: string | null
  created_at: string
  updated_at: string
  evrak_sayisi: number
}

interface Evrak {
  id: number
  evrak_tipi: 'cek' | 'senet'
  evrak_no: string
  tutar: number
  para_birimi: string
  doviz_kuru: number | null
  vade_tarihi: string
  durum: string
  kesideci: string | null
}

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

// ============================================
// Component
// ============================================

export default function CariDetayPage() {
  const params = useParams()
  const router = useRouter()
  const cariId = Number(params.id)

  // State
  const [cari, setCari] = useState<Cari | null>(null)
  const [evraklar, setEvraklar] = useState<Evrak[]>([])
  const [evrakPagination, setEvrakPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingEvraklar, setIsLoadingEvraklar] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // İstatistikler
  const [stats, setStats] = useState({
    toplam_tutar: 0,
    portfoy_tutar: 0,
    tahsil_tutar: 0,
  })

  // Silme modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // ============================================
  // Data Fetching
  // ============================================

  const fetchCariDetay = useCallback(async () => {
    if (!cariId || isNaN(cariId)) {
      setError('Geçersiz cari ID')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/cariler/${cariId}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Cari yüklenirken hata oluştu')
      }

      setCari(result.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cari yüklenirken hata oluştu')
    } finally {
      setIsLoading(false)
    }
  }, [cariId])

  const fetchEvraklar = useCallback(async (page: number = 1) => {
    if (!cariId || isNaN(cariId)) return

    setIsLoadingEvraklar(true)

    try {
      const params = new URLSearchParams()
      params.set('cari_id', String(cariId))
      params.set('page', String(page))
      params.set('limit', '10')

      const response = await fetch(`/api/evraklar?${params}`)
      const result = await response.json()

      if (response.ok) {
        setEvraklar(result.data)
        setEvrakPagination(result.pagination)

        // İstatistikleri hesapla
        calculateStats(result.data)
      }
    } catch (err) {
      console.error('Evraklar yüklenemedi:', err)
    } finally {
      setIsLoadingEvraklar(false)
    }
  }, [cariId])

  // Tüm evrakları çek ve istatistik hesapla (daha doğru)
  const fetchAllEvrakStats = useCallback(async () => {
    if (!cariId || isNaN(cariId)) return

    try {
      const params = new URLSearchParams()
      params.set('cari_id', String(cariId))
      params.set('limit', '1000') // Tüm evrakları al

      const response = await fetch(`/api/evraklar?${params}`)
      const result = await response.json()

      if (response.ok) {
        calculateStats(result.data)
      }
    } catch (err) {
      console.error('Evrak istatistikleri yüklenemedi:', err)
    }
  }, [cariId])

  const calculateStats = (evrakList: Evrak[]) => {
    let toplam = 0
    let portfoy = 0
    let tahsil = 0

    evrakList.forEach((evrak) => {
      const tutar = evrak.para_birimi === 'TRY' 
        ? evrak.tutar 
        : evrak.tutar * (evrak.doviz_kuru || 1)
      
      toplam += tutar
      
      if (evrak.durum === 'portfoy' || evrak.durum === 'bankada') {
        portfoy += tutar
      } else if (evrak.durum === 'tahsil') {
        tahsil += tutar
      }
    })

    setStats({
      toplam_tutar: toplam,
      portfoy_tutar: portfoy,
      tahsil_tutar: tahsil,
    })
  }

  useEffect(() => {
    fetchCariDetay()
  }, [fetchCariDetay])

  useEffect(() => {
    if (cari) {
      fetchEvraklar(1)
      fetchAllEvrakStats()
    }
  }, [cari, fetchEvraklar, fetchAllEvrakStats])

  // ============================================
  // Silme İşlemi
  // ============================================

  const handleDeleteClick = () => {
    setDeleteError(null)
    setIsDeleteModalOpen(true)
  }

  const handleDeleteConfirm = async () => {
    setIsDeleting(true)
    setDeleteError(null)

    try {
      const response = await fetch(`/api/cariler/${cariId}`, {
        method: 'DELETE',
      })
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Cari silinirken hata oluştu')
      }

      router.push('/cariler')
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Cari silinirken hata oluştu')
    } finally {
      setIsDeleting(false)
    }
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

  if (error || !cari) {
    return (
      <div className="space-y-4">
        <Button outline onClick={() => router.push('/cariler')}>
          <ArrowLeftIcon className="h-5 w-5" />
          Listeye Dön
        </Button>
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400" />
          <Text className="mt-4 text-red-700">
            {error || 'Cari bulunamadı'}
          </Text>
        </div>
      </div>
    )
  }

  // ============================================
  // Render - Main
  // ============================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <Button outline onClick={() => router.push('/cariler')}>
            <ArrowLeftIcon className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <Heading>{cari.ad_soyad}</Heading>
              <Badge color={getCariTipColor(cari.tip)}>
                {getCariTipLabel(cari.tip)}
              </Badge>
            </div>
            {cari.telefon && (
              <Text className="mt-1 flex items-center gap-1">
                <PhoneIcon className="h-4 w-4" />
                {cari.telefon}
              </Text>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button outline onClick={() => router.push(`/cariler/${cariId}/duzenle`)}>
            <PencilSquareIcon className="h-5 w-5" />
            Düzenle
          </Button>
          <Button color="red" onClick={handleDeleteClick}>
            <TrashIcon className="h-5 w-5" />
            Sil
          </Button>
        </div>
      </div>

      {/* İstatistik Kartları */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <Text className="text-sm text-zinc-500">Toplam Evrak</Text>
          <div className="mt-1 text-2xl font-semibold text-zinc-900">
            {cari.evrak_sayisi}
          </div>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <Text className="text-sm text-zinc-500">Toplam Tutar</Text>
          <div className="mt-1 text-2xl font-semibold text-zinc-900">
            {formatCurrency(stats.toplam_tutar)}
          </div>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <Text className="text-sm text-zinc-500">Portföyde</Text>
          <div className="mt-1 text-2xl font-semibold text-blue-600">
            {formatCurrency(stats.portfoy_tutar)}
          </div>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <Text className="text-sm text-zinc-500">Tahsil Edilen</Text>
          <div className="mt-1 text-2xl font-semibold text-emerald-600">
            {formatCurrency(stats.tahsil_tutar)}
          </div>
        </div>
      </div>

      {/* Cari Bilgileri */}
      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <Heading level={2} className="text-lg">
          Cari Bilgileri
        </Heading>
        <Divider className="my-4" />

        <DescriptionList>
          <DescriptionTerm>Ad Soyad / Firma</DescriptionTerm>
          <DescriptionDetails className="font-medium">{cari.ad_soyad}</DescriptionDetails>

          <DescriptionTerm>Cari Tipi</DescriptionTerm>
          <DescriptionDetails>
            <Badge color={getCariTipColor(cari.tip)}>
              {getCariTipLabel(cari.tip)}
            </Badge>
          </DescriptionDetails>

          {cari.telefon && (
            <>
              <DescriptionTerm>
                <span className="flex items-center gap-1">
                  <PhoneIcon className="h-4 w-4" />
                  Telefon
                </span>
              </DescriptionTerm>
              <DescriptionDetails>
                <a
                  href={`tel:${cari.telefon}`}
                  className="text-blue-600 hover:underline"
                >
                  {cari.telefon}
                </a>
              </DescriptionDetails>
            </>
          )}

          {cari.email && (
            <>
              <DescriptionTerm>
                <span className="flex items-center gap-1">
                  <EnvelopeIcon className="h-4 w-4" />
                  E-posta
                </span>
              </DescriptionTerm>
              <DescriptionDetails>
                <a
                  href={`mailto:${cari.email}`}
                  className="text-blue-600 hover:underline"
                >
                  {cari.email}
                </a>
              </DescriptionDetails>
            </>
          )}

          {cari.vergi_no && (
            <>
              <DescriptionTerm>
                <span className="flex items-center gap-1">
                  <IdentificationIcon className="h-4 w-4" />
                  Vergi No
                </span>
              </DescriptionTerm>
              <DescriptionDetails>{cari.vergi_no}</DescriptionDetails>
            </>
          )}

          {cari.adres && (
            <>
              <DescriptionTerm>
                <span className="flex items-center gap-1">
                  <MapPinIcon className="h-4 w-4" />
                  Adres
                </span>
              </DescriptionTerm>
              <DescriptionDetails className="whitespace-pre-wrap">{cari.adres}</DescriptionDetails>
            </>
          )}

          {cari.notlar && (
            <>
              <DescriptionTerm>Notlar</DescriptionTerm>
              <DescriptionDetails className="whitespace-pre-wrap">{cari.notlar}</DescriptionDetails>
            </>
          )}

          <DescriptionTerm>Kayıt Tarihi</DescriptionTerm>
          <DescriptionDetails>{formatDateTime(cari.created_at)}</DescriptionDetails>

          <DescriptionTerm>Son Güncelleme</DescriptionTerm>
          <DescriptionDetails>{formatDateTime(cari.updated_at)}</DescriptionDetails>
        </DescriptionList>
      </div>

      {/* Evraklar Tablosu */}
      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <Heading level={2} className="text-lg">
            <span className="flex items-center gap-2">
              <DocumentTextIcon className="h-5 w-5" />
              Evraklar
              {evrakPagination.total > 0 && (
                <Badge color="zinc">{evrakPagination.total} kayıt</Badge>
              )}
            </span>
          </Heading>
          <Button
            color="emerald"
            onClick={() => router.push(`/evraklar/ekle?cari_id=${cariId}`)}
          >
            Evrak Ekle
          </Button>
        </div>
        <Divider className="my-4" />

        {isLoadingEvraklar ? (
          <div className="flex items-center justify-center py-8">
            <ArrowPathIcon className="h-6 w-6 animate-spin text-zinc-400" />
          </div>
        ) : evraklar.length === 0 ? (
          <div className="py-8 text-center">
            <DocumentTextIcon className="mx-auto h-12 w-12 text-zinc-300" />
            <Text className="mt-2 text-zinc-500">Bu cariye ait evrak bulunmuyor.</Text>
            <Button
              color="emerald"
              className="mt-4"
              onClick={() => router.push(`/evraklar/ekle?cari_id=${cariId}`)}
            >
              İlk Evrakı Ekle
            </Button>
          </div>
        ) : (
          <>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>Durum</TableHeader>
                  <TableHeader>Tip</TableHeader>
                  <TableHeader>Evrak No</TableHeader>
                  <TableHeader className="text-right">Tutar</TableHeader>
                  <TableHeader>Vade</TableHeader>
                  <TableHeader>Keşideci</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {evraklar.map((evrak) => (
                  <TableRow
                    key={evrak.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/evraklar/${evrak.id}`)}
                  >
                    <TableCell>
                      <Badge color={getDurumColor(evrak.durum)}>
                        {getDurumLabel(evrak.durum)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge color={evrak.evrak_tipi === 'cek' ? 'cyan' : 'amber'}>
                        {getEvrakTipiLabel(evrak.evrak_tipi)}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{evrak.evrak_no}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(evrak.tutar, evrak.para_birimi)}
                    </TableCell>
                    <TableCell>{formatDate(evrak.vade_tarihi)}</TableCell>
                    <TableCell className="max-w-[150px] truncate">{evrak.kesideci || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Sayfalama */}
            {evrakPagination.totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between border-t border-zinc-200 pt-4">
                <Text className="text-sm text-zinc-500">
                  Sayfa {evrakPagination.page} / {evrakPagination.totalPages}
                </Text>
                <div className="flex gap-2">
                  <Button
                    outline
                    disabled={evrakPagination.page <= 1}
                    onClick={() => fetchEvraklar(evrakPagination.page - 1)}
                  >
                    Önceki
                  </Button>
                  <Button
                    outline
                    disabled={evrakPagination.page >= evrakPagination.totalPages}
                    onClick={() => fetchEvraklar(evrakPagination.page + 1)}
                  >
                    Sonraki
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Silme Onay Modal */}
      <Dialog open={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)}>
        <DialogTitle>
          <div className="flex items-center gap-2 text-red-600">
            <TrashIcon className="h-6 w-6" />
            Cariyi Sil
          </div>
        </DialogTitle>
        <DialogDescription>
          <span className="font-semibold">{cari.ad_soyad}</span> isimli cariyi silmek istediğinize
          emin misiniz?
        </DialogDescription>
        <DialogBody>
          {deleteError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {deleteError}
            </div>
          )}

          {cari.evrak_sayisi > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
              <strong>Uyarı:</strong> Bu cariye ait {cari.evrak_sayisi} evrak bulunmaktadır.
              Önce evrakları silmeniz veya başka bir cariye aktarmanız gerekmektedir.
            </div>
          )}

          <p className="mt-4 text-sm text-zinc-600">
            Bu işlem geri alınamaz.
          </p>
        </DialogBody>
        <DialogActions>
          <Button outline onClick={() => setIsDeleteModalOpen(false)} disabled={isDeleting}>
            İptal
          </Button>
          <Button color="red" onClick={handleDeleteConfirm} disabled={isDeleting}>
            {isDeleting ? (
              <>
                <ArrowPathIcon className="h-5 w-5 animate-spin" />
                Siliniyor...
              </>
            ) : (
              <>
                <TrashIcon className="h-5 w-5" />
                Evet, Sil
              </>
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}
