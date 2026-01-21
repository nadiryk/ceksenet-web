'use client'

// ============================================
// ÇekSenet Web - Krediler Listesi Sayfası
// ============================================

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Heading } from '@/components/ui/heading'
import { Text } from '@/components/ui/text'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeader,
  TableCell,
} from '@/components/ui/table'
import {
  PlusIcon,
  ArrowPathIcon,
  BanknotesIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/20/solid'
import {
  formatCurrency,
  formatDate,
  getKrediDurumLabel,
  getKrediDurumColor,
} from '@/lib/utils/format'

// ============================================
// Types
// ============================================

interface Kredi {
  id: number
  banka_id: number | null
  banka: { id: number; ad: string } | null
  kredi_turu: string
  anapara: number
  faiz_orani: number
  vade_ay: number
  baslangic_tarihi: string
  aylik_taksit: number
  toplam_odeme: number
  para_birimi: string
  durum: string
  notlar: string | null
  odenen_taksit_sayisi?: number
  kalan_taksit_sayisi?: number
  geciken_taksit_sayisi?: number
  kalan_borc?: number
}

interface KrediOzet {
  aktif_kredi_sayisi: number
  toplam_kredi_sayisi: number
  toplam_borc: number
  bu_ay_odeme: number
  geciken_taksit_sayisi: number
  geciken_tutar: number
}

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

// ============================================
// Constants
// ============================================

const KREDI_TURU_LABELS: Record<string, string> = {
  tuketici: 'Tüketici',
  konut: 'Konut',
  tasit: 'Taşıt',
  ticari: 'Ticari',
  isletme: 'İşletme',
  diger: 'Diğer',
}

// ============================================
// Stat Card Component
// ============================================

interface StatCardProps {
  title: string
  value: string
  subtitle?: string
  color?: 'default' | 'green' | 'red' | 'yellow' | 'blue'
  icon?: React.ReactNode
}

function StatCard({ title, value, subtitle, color = 'default', icon }: StatCardProps) {
  const colorClasses = {
    default: 'bg-white',
    green: 'bg-green-50 border-green-200',
    red: 'bg-red-50 border-red-200',
    yellow: 'bg-yellow-50 border-yellow-200',
    blue: 'bg-blue-50 border-blue-200',
  }

  const textClasses = {
    default: 'text-zinc-900',
    green: 'text-green-700',
    red: 'text-red-700',
    yellow: 'text-yellow-700',
    blue: 'text-blue-700',
  }

  return (
    <div className={`rounded-lg border p-4 ${colorClasses[color]}`}>
      <div className="flex items-center justify-between">
        <Text className="text-sm font-medium text-zinc-500">{title}</Text>
        {icon}
      </div>
      <div className={`mt-2 text-2xl font-semibold ${textClasses[color]}`}>
        {value}
      </div>
      {subtitle && (
        <Text className="mt-1 text-xs text-zinc-500">{subtitle}</Text>
      )}
    </div>
  )
}

// ============================================
// Progress Bar Component
// ============================================

interface ProgressBarProps {
  current: number
  total: number
}

function ProgressBar({ current, total }: ProgressBarProps) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0
  
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 rounded-full bg-zinc-200">
        <div
          className="h-1.5 rounded-full bg-green-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="whitespace-nowrap text-xs text-zinc-500">
        {current}/{total}
      </span>
    </div>
  )
}

// ============================================
// Component
// ============================================

export default function KredilerPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Data State
  const [krediler, setKrediler] = useState<Kredi[]>([])
  const [ozet, setOzet] = useState<KrediOzet | null>(null)
  const [bankalar, setBankalar] = useState<{ id: number; ad: string }[]>([])
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  })

  // UI State
  const [isLoading, setIsLoading] = useState(true)
  const [isOzetLoading, setIsOzetLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter State
  const [durum, setDurum] = useState(searchParams.get('durum') || '')
  const [krediTuru, setKrediTuru] = useState(searchParams.get('kredi_turu') || '')
  const [bankaId, setBankaId] = useState(searchParams.get('banka_id') || '')
  const [limit, setLimit] = useState(Number(searchParams.get('limit')) || 20)
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1)

  // ============================================
  // Data Fetching
  // ============================================

  // Bankalar listesi
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
      }
    }
    loadBankalar()
  }, [])

  // Kredi özeti
  const fetchOzet = useCallback(async () => {
    setIsOzetLoading(true)
    try {
      const response = await fetch('/api/krediler/ozet')
      const result = await response.json()
      if (response.ok) {
        setOzet(result.data)
      }
    } catch (err) {
      console.error('Kredi özeti yüklenemedi:', err)
    } finally {
      setIsOzetLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOzet()
  }, [fetchOzet])

  // Kredi listesi
  const fetchKrediler = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', String(limit))
      if (durum) params.set('durum', durum)
      if (krediTuru) params.set('kredi_turu', krediTuru)
      if (bankaId) params.set('banka_id', bankaId)

      const response = await fetch(`/api/krediler?${params}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Krediler yüklenirken hata oluştu')
      }

      setKrediler(result.data)
      setPagination(result.pagination)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Krediler yüklenirken hata oluştu')
    } finally {
      setIsLoading(false)
    }
  }, [page, limit, durum, krediTuru, bankaId])

  useEffect(() => {
    fetchKrediler()
  }, [fetchKrediler])

  // URL params sync
  useEffect(() => {
    const params = new URLSearchParams()
    if (durum) params.set('durum', durum)
    if (krediTuru) params.set('kredi_turu', krediTuru)
    if (bankaId) params.set('banka_id', bankaId)
    if (limit !== 20) params.set('limit', String(limit))
    if (page !== 1) params.set('page', String(page))

    const newUrl = params.toString() ? `?${params}` : '/krediler'
    router.replace(newUrl, { scroll: false })
  }, [durum, krediTuru, bankaId, limit, page, router])

  // ============================================
  // Handlers
  // ============================================

  const handleClearFilters = () => {
    setDurum('')
    setKrediTuru('')
    setBankaId('')
    setPage(1)
  }

  const handleRefresh = () => {
    fetchKrediler()
    fetchOzet()
  }

  const hasFilters = durum || krediTuru || bankaId

  // ============================================
  // Render
  // ============================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Heading>Krediler</Heading>
          <Text className="mt-1">
            {pagination.total > 0
              ? `Toplam ${pagination.total} kredi`
              : 'Kredi takip listesi'}
          </Text>
        </div>
        <div className="flex gap-2">
          <Button outline onClick={handleRefresh} title="Yenile">
            <ArrowPathIcon className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button color="blue" onClick={() => router.push('/krediler/ekle')}>
            <PlusIcon className="h-5 w-5" />
            Yeni Kredi
          </Button>
        </div>
      </div>

      {/* Özet Kartları */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Aktif Kredi"
          value={isOzetLoading ? '...' : String(ozet?.aktif_kredi_sayisi || 0)}
          subtitle={`Toplam ${ozet?.toplam_kredi_sayisi || 0} kredi`}
          color="blue"
          icon={<BanknotesIcon className="h-5 w-5 text-blue-500" />}
        />
        <StatCard
          title="Toplam Borç"
          value={isOzetLoading ? '...' : formatCurrency(ozet?.toplam_borc || 0)}
          color="default"
        />
        <StatCard
          title="Bu Ay Ödenecek"
          value={isOzetLoading ? '...' : formatCurrency(ozet?.bu_ay_odeme || 0)}
          color="yellow"
        />
        <StatCard
          title="Geciken Taksit"
          value={isOzetLoading ? '...' : String(ozet?.geciken_taksit_sayisi || 0)}
          subtitle={ozet?.geciken_taksit_sayisi ? formatCurrency(ozet.geciken_tutar) : 'Geciken yok'}
          color={ozet?.geciken_taksit_sayisi ? 'red' : 'green'}
          icon={ozet?.geciken_taksit_sayisi ? (
            <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
          ) : undefined}
        />
      </div>

      {/* Filters */}
      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-zinc-700">
              Banka
            </label>
            <Select
              value={bankaId}
              onChange={(e) => { setBankaId(e.target.value); setPage(1) }}
            >
              <option value="">Tüm Bankalar</option>
              {bankalar.map((banka) => (
                <option key={banka.id} value={banka.id}>
                  {banka.ad}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-zinc-700">
              Kredi Türü
            </label>
            <Select
              value={krediTuru}
              onChange={(e) => { setKrediTuru(e.target.value); setPage(1) }}
            >
              <option value="">Tüm Türler</option>
              {Object.entries(KREDI_TURU_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-zinc-700">
              Durum
            </label>
            <Select
              value={durum}
              onChange={(e) => { setDurum(e.target.value); setPage(1) }}
            >
              <option value="">Tüm Durumlar</option>
              <option value="aktif">Aktif</option>
              <option value="kapandi">Kapandı</option>
              <option value="erken_kapandi">Erken Kapandı</option>
            </Select>
          </div>

          {hasFilters && (
            <Button outline onClick={handleClearFilters}>
              Temizle
            </Button>
          )}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <ArrowPathIcon className="h-8 w-8 animate-spin text-zinc-400" />
        </div>
      ) : krediler.length === 0 ? (
        <div className="rounded-lg border border-zinc-200 bg-white p-12 text-center">
          <BanknotesIcon className="mx-auto h-12 w-12 text-zinc-400" />
          <Text className="mt-4">
            {hasFilters
              ? 'Filtrelere uygun kredi bulunamadı.'
              : 'Henüz kredi bulunmuyor.'}
          </Text>
          {!hasFilters && (
            <Button color="blue" className="mt-4" onClick={() => router.push('/krediler/ekle')}>
              İlk Krediyi Ekle
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="rounded-lg border border-zinc-200 bg-white">
            <Table striped>
              <TableHead>
                <TableRow>
                  <TableHeader>Banka</TableHeader>
                  <TableHeader>Kredi Türü</TableHeader>
                  <TableHeader>Anapara</TableHeader>
                  <TableHeader>Aylık Taksit</TableHeader>
                  <TableHeader>İlerleme</TableHeader>
                  <TableHeader>Başlangıç</TableHeader>
                  <TableHeader>Durum</TableHeader>
                  <TableHeader>Kalan Borç</TableHeader>
                  <TableHeader className="text-right">İşlem</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {krediler.map((kredi) => {
                  const toplamTaksit = kredi.vade_ay
                  const odenenTaksit = kredi.odenen_taksit_sayisi || 0
                  const gecikenTaksit = kredi.geciken_taksit_sayisi || 0

                  return (
                    <TableRow 
                      key={kredi.id} 
                      className="cursor-pointer"
                      onClick={() => router.push(`/krediler/${kredi.id}`)}
                    >
                      <TableCell className="font-medium">
                        {kredi.banka?.ad || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge color="zinc">
                          {KREDI_TURU_LABELS[kredi.kredi_turu] || kredi.kredi_turu}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(kredi.anapara, kredi.para_birimi)}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(kredi.aylik_taksit, kredi.para_birimi)}
                      </TableCell>
                      <TableCell className="min-w-32">
                        <ProgressBar current={odenenTaksit} total={toplamTaksit} />
                        {gecikenTaksit > 0 && (
                          <span className="mt-1 block text-xs text-red-600">
                            {gecikenTaksit} geciken
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-zinc-600">
                        {formatDate(kredi.baslangic_tarihi)}
                      </TableCell>
                      <TableCell>
                        <Badge color={getKrediDurumColor(kredi.durum)}>
                          {getKrediDurumLabel(kredi.durum)}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium text-zinc-900">
                        {formatCurrency(kredi.kalan_borc || 0, kredi.para_birimi)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          outline
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/krediler/${kredi.id}`)
                          }}
                        >
                          Detay
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
              <div className="flex items-center gap-2">
                <Text className="text-sm">Sayfa başına:</Text>
                <Select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value))
                    setPage(1)
                  }}
                  className="w-20"
                >
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="50">50</option>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  outline
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  Önceki
                </Button>
                <Text className="px-4 text-sm">
                  Sayfa {page} / {pagination.totalPages}
                </Text>
                <Button
                  outline
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage(p => p + 1)}
                >
                  Sonraki
                </Button>
              </div>

              <Text className="text-sm text-zinc-500">
                Toplam {pagination.total} kayıt
              </Text>
            </div>
          )}
        </>
      )}
    </div>
  )
}
