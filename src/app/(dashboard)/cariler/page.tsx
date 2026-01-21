'use client'

// ============================================
// ÇekSenet Web - Cari Listesi Sayfası
// ============================================

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Heading } from '@/components/ui/heading'
import { Text } from '@/components/ui/text'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
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
  MagnifyingGlassIcon,
  ArrowPathIcon,
  UserGroupIcon,
} from '@heroicons/react/20/solid'
import { getCariTipLabel, getCariTipColor } from '@/lib/utils/format'

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

export default function CarilerPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Data state
  const [cariler, setCariler] = useState<Cari[]>([])
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  })

  // Filter state (from URL params)
  const [tip, setTip] = useState(searchParams.get('tip') || '')
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1'))
  const [limit, setLimit] = useState(parseInt(searchParams.get('limit') || '10'))

  // UI state
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ============================================
  // Fetch Data
  // ============================================

  const fetchCariler = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', String(limit))
      if (tip) params.set('tip', tip)
      if (search.trim()) params.set('search', search.trim())

      const response = await fetch(`/api/cariler?${params}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Cariler yüklenirken hata oluştu')
      }

      setCariler(result.data)
      setPagination(result.pagination)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cariler yüklenirken hata oluştu')
      setCariler([])
    } finally {
      setIsLoading(false)
    }
  }, [tip, search, page, limit])

  // Initial load and filter changes
  useEffect(() => {
    fetchCariler()
  }, [fetchCariler])

  // Sync filters to URL
  useEffect(() => {
    const params = new URLSearchParams()
    if (tip) params.set('tip', tip)
    if (search) params.set('search', search)
    if (page > 1) params.set('page', String(page))
    if (limit !== 10) params.set('limit', String(limit))
    
    const newUrl = params.toString() ? `?${params}` : '/cariler'
    router.replace(newUrl, { scroll: false })
  }, [tip, search, page, limit, router])

  // ============================================
  // Handlers
  // ============================================

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchCariler()
  }

  const handleClearFilters = () => {
    setTip('')
    setSearch('')
    setPage(1)
  }

  // ============================================
  // Render
  // ============================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Heading>Cariler</Heading>
          <Text className="mt-1">Müşteri ve tedarikçi hesaplarını yönetin</Text>
        </div>
        <Button color="blue" onClick={() => router.push('/cariler/ekle')}>
          <PlusIcon className="h-5 w-5" />
          Yeni Cari
        </Button>
      </div>

      {/* Filters */}
      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <form onSubmit={handleSearch} className="flex flex-wrap items-end gap-4">
          {/* Tip Filter */}
          <div className="w-full sm:w-40">
            <label className="mb-1 block text-sm font-medium text-zinc-700">
              Tip
            </label>
            <Select
              value={tip}
              onChange={(e) => {
                setTip(e.target.value)
                setPage(1)
              }}
            >
              <option value="">Tümü</option>
              <option value="musteri">Müşteri</option>
              <option value="tedarikci">Tedarikçi</option>
            </Select>
          </div>

          {/* Search */}
          <div className="min-w-[200px] flex-1">
            <label className="mb-1 block text-sm font-medium text-zinc-700">
              Arama
            </label>
            <Input
              type="text"
              placeholder="Ad, telefon, vergi no..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-2">
            <Button type="submit" outline>
              <MagnifyingGlassIcon className="h-5 w-5" />
              Ara
            </Button>
            <Button type="button" plain onClick={handleClearFilters}>
              Temizle
            </Button>
          </div>
        </form>
      </div>

      {/* Results Info */}
      <div className="flex items-center justify-between text-sm text-zinc-600">
        <span>
          {isLoading ? 'Yükleniyor...' : `${pagination.total} cari bulundu`}
        </span>
        <div className="flex items-center gap-2">
          <span>Sayfa başına:</span>
          <Select
            value={limit}
            onChange={(e) => {
              setLimit(parseInt(e.target.value))
              setPage(1)
            }}
            className="w-20"
          >
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
          </Select>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <ArrowPathIcon className="h-8 w-8 animate-spin text-zinc-400" />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && cariler.length === 0 && (
        <div className="rounded-lg border border-zinc-200 bg-white p-12 text-center">
          <UserGroupIcon className="mx-auto h-12 w-12 text-zinc-400" />
          <Text className="mt-4">Cari bulunamadı</Text>
          <Button className="mt-4" onClick={() => router.push('/cariler/ekle')}>
            <PlusIcon className="h-5 w-5" />
            İlk Cariyi Ekle
          </Button>
        </div>
      )}

      {/* Table */}
      {!isLoading && !error && cariler.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Ad Soyad / Firma</TableHeader>
                <TableHeader>Tip</TableHeader>
                <TableHeader>Telefon</TableHeader>
                <TableHeader>Vergi No</TableHeader>
                <TableHeader className="text-right">İşlem</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {cariler.map((cari) => (
                <TableRow
                  key={cari.id}
                  className="cursor-pointer hover:bg-zinc-50"
                  onClick={() => router.push(`/cariler/${cari.id}`)}
                >
                  <TableCell className="font-medium">{cari.ad_soyad}</TableCell>
                  <TableCell>
                    <Badge color={getCariTipColor(cari.tip)}>
                      {getCariTipLabel(cari.tip)}
                    </Badge>
                  </TableCell>
                  <TableCell>{cari.telefon || '-'}</TableCell>
                  <TableCell>{cari.vergi_no || '-'}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      plain
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/cariler/${cari.id}`)
                      }}
                    >
                      Detay
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {!isLoading && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Text className="text-sm">
            Sayfa {pagination.page} / {pagination.totalPages}
          </Text>
          <div className="flex gap-2">
            <Button
              outline
              disabled={pagination.page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Önceki
            </Button>
            <Button
              outline
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Sonraki
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
