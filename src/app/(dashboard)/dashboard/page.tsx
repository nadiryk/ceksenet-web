'use client'

// ============================================
// ÇekSenet Web - Dashboard Page
// Ana sayfa - istatistikler, grafikler
// ============================================

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowPathIcon } from '@heroicons/react/20/solid'

import { Heading, Subheading } from '@/components/ui/heading'
import { Text } from '@/components/ui/text'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from '@/components/ui/table'

import { StatCard, StatCardSkeleton, DurumPieChart } from '@/components/dashboard'
import { formatCurrency, formatDate, getDurumColor, getDurumLabel, getEvrakTipiLabel } from '@/lib/utils/format'

// ============================================
// Types
// ============================================

interface DashboardData {
  ozet: {
    toplam_evrak: number
    toplam_tutar: number
    portfoydeki: number
    vadesi_yaklasan: number
    vadesi_gecen: number
  }
  durum_dagilimi: { durum: string; adet: number; tutar: number }[]
  tip_dagilimi: { tip: string; adet: number; tutar: number }[]
  son_evraklar: any[]
  yaklasan_vadeler: any[]
  kredi_ozeti: {
    aktif_kredi: number
    toplam_borc: number
    bu_ay_taksit: number
    geciken_taksit: number
    geciken_taksit_adet: number
  }
}

// ============================================
// Dashboard Page Component
// ============================================

export default function DashboardPage() {
  const router = useRouter()

  // State
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // ============================================
  // Data Fetching
  // ============================================

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true)
    } else {
      setLoading(true)
    }
    setError(null)

    try {
      const response = await fetch('/api/dashboard')
      
      if (!response.ok) {
        throw new Error('Veri yüklenemedi')
      }

      const result = await response.json()
      setData(result.data)
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Dashboard veri yükleme hatası:', err)
      setError('Veriler yüklenirken bir hata oluştu.')
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  // İlk yükleme
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Auto-refresh (5 dakikada bir)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData(true)
    }, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [fetchData])

  // ============================================
  // Event Handlers
  // ============================================

  const handleRefresh = () => {
    fetchData(true)
  }

  // ============================================
  // Render
  // ============================================

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Heading>Dashboard</Heading>
          <Text className="mt-1">Çek ve senet takip sistemi özet görünümü</Text>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <Text className="text-xs text-zinc-500">
              Son güncelleme: {lastUpdated.toLocaleTimeString('tr-TR')}
            </Text>
          )}
          <Button outline onClick={handleRefresh} disabled={isRefreshing}>
            <ArrowPathIcon className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Yenileniyor...' : 'Yenile'}
          </Button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
          <Button color="red" className="mt-2" onClick={() => fetchData()}>
            Tekrar Dene
          </Button>
        </div>
      )}

      {/* İstatistik Kartları */}
      <section>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {loading ? (
            <>
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </>
          ) : data ? (
            <>
              <StatCard
                title="Portföyde"
                value={data.ozet.portfoydeki}
                subValue={`Toplam ${data.ozet.toplam_evrak} evrak`}
                icon="document"
                color="blue"
                onClick={() => router.push('/evraklar?durum=portfoy')}
              />
              <StatCard
                title="Toplam Tutar"
                value={formatCurrency(data.ozet.toplam_tutar)}
                subValue="TRY karşılığı"
                icon="banknotes"
                color="green"
              />
              <StatCard
                title="Vadesi Yaklaşan"
                value={data.ozet.vadesi_yaklasan}
                subValue="Önümüzdeki 7 gün"
                icon="clock"
                color="amber"
                onClick={() => router.push('/evraklar?vade=yaklasan')}
              />
              <StatCard
                title="Vadesi Geçmiş"
                value={data.ozet.vadesi_gecen}
                subValue="Dikkat gerektirir"
                icon="warning"
                color="red"
                onClick={() => router.push('/evraklar?vade=gecmis')}
              />
            </>
          ) : null}
        </div>
      </section>

      {/* Grafikler ve Tablolar Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Durum Dağılımı - Pie Chart */}
        <section className="rounded-xl border border-zinc-200 bg-white p-6">
          <Subheading>Durum Dağılımı</Subheading>
          <Text className="mt-1 text-sm">Evrakların durumlarına göre dağılımı</Text>
          <div className="mt-4">
            <DurumPieChart
              data={data?.durum_dagilimi || []}
              isLoading={loading}
              height={280}
            />
          </div>
        </section>

        {/* Kredi Özeti */}
        <section className="rounded-xl border border-zinc-200 bg-white p-6">
          <Subheading>Kredi Özeti</Subheading>
          <Text className="mt-1 text-sm">Aktif krediler ve taksit durumu</Text>
          <div className="mt-4">
            {loading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-12 rounded bg-zinc-200" />
                <div className="h-12 rounded bg-zinc-200" />
                <div className="h-12 rounded bg-zinc-200" />
              </div>
            ) : data?.kredi_ozeti ? (
              <div className="space-y-4">
                {/* Geciken Taksit Uyarısı */}
                {data.kredi_ozeti.geciken_taksit_adet > 0 && (
                  <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">
                    <span className="text-sm font-medium">
                      {data.kredi_ozeti.geciken_taksit_adet} gecikmiş taksit!
                    </span>
                    <span className="text-sm">
                      ({formatCurrency(data.kredi_ozeti.geciken_taksit)})
                    </span>
                  </div>
                )}

                <div className="grid gap-3">
                  <div className="flex items-center justify-between rounded-lg bg-blue-50 px-4 py-3">
                    <span className="text-sm font-medium text-blue-700">Aktif Kredi</span>
                    <span className="text-lg font-semibold text-blue-900">{data.kredi_ozeti.aktif_kredi}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-amber-50 px-4 py-3">
                    <span className="text-sm font-medium text-amber-700">Kalan Borç</span>
                    <span className="text-lg font-semibold text-amber-900">{formatCurrency(data.kredi_ozeti.toplam_borc)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-zinc-100 px-4 py-3">
                    <span className="text-sm font-medium text-zinc-700">Bu Ay Ödenecek</span>
                    <span className="text-lg font-semibold text-zinc-900">{formatCurrency(data.kredi_ozeti.bu_ay_taksit)}</span>
                  </div>
                </div>

                <Button
                  outline
                  className="w-full justify-center"
                  onClick={() => router.push('/krediler')}
                >
                  Kredileri Görüntüle
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <Text className="text-zinc-500">Henüz kredi kaydı yok</Text>
                <Button outline className="mt-3" onClick={() => router.push('/krediler/ekle')}>
                  İlk Krediyi Ekle
                </Button>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Son Evraklar ve Yaklaşan Vadeler */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Son Eklenen Evraklar */}
        <section className="rounded-xl border border-zinc-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <Subheading>Son Eklenen Evraklar</Subheading>
              <Text className="mt-1 text-sm">En son eklenen 5 evrak</Text>
            </div>
            <Button outline onClick={() => router.push('/evraklar')}>
              Tümünü Gör
            </Button>
          </div>
          <div className="mt-4">
            {loading ? (
              <div className="animate-pulse space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-12 rounded bg-zinc-200" />
                ))}
              </div>
            ) : data?.son_evraklar && data.son_evraklar.length > 0 ? (
              <div className="overflow-hidden rounded-lg border border-zinc-200">
                <Table dense>
                  <TableHead>
                    <TableRow>
                      <TableHeader>Evrak</TableHeader>
                      <TableHeader>Cari</TableHeader>
                      <TableHeader className="text-right">Tutar</TableHeader>
                      <TableHeader>Durum</TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.son_evraklar.map((evrak: any) => (
                      <TableRow
                        key={evrak.id}
                        href={`/evraklar/${evrak.id}`}
                        className="cursor-pointer"
                      >
                        <TableCell>
                          <div>
                            <p className="font-medium">{evrak.evrak_no}</p>
                            <p className="text-xs text-zinc-500">{getEvrakTipiLabel(evrak.evrak_tipi)}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-zinc-600">
                          {evrak.cariler?.ad_soyad || '-'}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(evrak.tutar, evrak.para_birimi)}
                        </TableCell>
                        <TableCell>
                          <Badge color={getDurumColor(evrak.durum)}>
                            {getDurumLabel(evrak.durum)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-center text-sm text-zinc-500 py-8">
                Henüz evrak bulunmuyor
              </p>
            )}
          </div>
        </section>

        {/* Yaklaşan Vadeler */}
        <section className="rounded-xl border border-zinc-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <Subheading>Yaklaşan Vadeler</Subheading>
              <Text className="mt-1 text-sm">En yakın 5 vade</Text>
            </div>
            <Button outline onClick={() => router.push('/evraklar?vade=yaklasan')}>
              Tümünü Gör
            </Button>
          </div>
          <div className="mt-4">
            {loading ? (
              <div className="animate-pulse space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-12 rounded bg-zinc-200" />
                ))}
              </div>
            ) : data?.yaklasan_vadeler && data.yaklasan_vadeler.length > 0 ? (
              <div className="overflow-hidden rounded-lg border border-zinc-200">
                <Table dense>
                  <TableHead>
                    <TableRow>
                      <TableHeader>Evrak</TableHeader>
                      <TableHeader>Vade Tarihi</TableHeader>
                      <TableHeader className="text-right">Tutar</TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.yaklasan_vadeler.map((evrak: any) => (
                      <TableRow
                        key={evrak.id}
                        href={`/evraklar/${evrak.id}`}
                        className="cursor-pointer"
                      >
                        <TableCell>
                          <div>
                            <p className="font-medium">{evrak.evrak_no}</p>
                            <p className="text-xs text-zinc-500">{evrak.cariler?.ad_soyad || '-'}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{formatDate(evrak.vade_tarihi)}</span>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(evrak.tutar, evrak.para_birimi)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-center text-sm text-zinc-500 py-8">
                Yaklaşan vade bulunmuyor
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
