'use client'

// ============================================
// ÇekSenet Web - Raporlar Sayfası
// Tarih aralığı raporu + Excel export
// ============================================

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Heading } from '@/components/ui/heading'
import { Text } from '@/components/ui/text'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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
  ChartBarIcon,
  ArrowPathIcon,
  ArrowDownTrayIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  DocumentChartBarIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/20/solid'
import { formatCurrency, formatDate } from '@/lib/utils/format'

// ============================================
// Types
// ============================================

type EvrakDurumu = 'portfoy' | 'bankada' | 'ciro' | 'tahsil' | 'karsiliksiz'
type EvrakTipi = 'cek' | 'senet'

interface Evrak {
  id: number
  evrak_no: string
  evrak_tipi: EvrakTipi
  tutar: number
  para_birimi: string
  doviz_kuru: number | null
  vade_tarihi: string
  durum: EvrakDurumu
  kesideci: string | null
  cari: {
    id: number
    ad_soyad: string
    tip: string
  } | null
}

interface RaporOzet {
  toplam: { adet: number; tutar: number }
  cek: { adet: number; tutar: number }
  senet: { adet: number; tutar: number }
}

// ============================================
// Constants
// ============================================

const DURUM_LABELS: Record<EvrakDurumu, string> = {
  portfoy: 'Portföy',
  bankada: 'Bankada',
  ciro: 'Ciro Edildi',
  tahsil: 'Tahsil Edildi',
  karsiliksiz: 'Karşılıksız',
}

const DURUM_COLORS: Record<EvrakDurumu, string> = {
  portfoy: 'blue',
  bankada: 'purple',
  ciro: 'orange',
  tahsil: 'green',
  karsiliksiz: 'red',
}

const EVRAK_TIPI_LABELS: Record<EvrakTipi, string> = {
  cek: 'Çek',
  senet: 'Senet',
}

const EVRAK_TIPI_COLORS: Record<EvrakTipi, string> = {
  cek: 'cyan',
  senet: 'amber',
}

const DURUM_OPTIONS: Array<{ value: EvrakDurumu | ''; label: string }> = [
  { value: '', label: 'Tüm Durumlar' },
  { value: 'portfoy', label: 'Portföy' },
  { value: 'bankada', label: 'Bankada' },
  { value: 'ciro', label: 'Ciro Edildi' },
  { value: 'tahsil', label: 'Tahsil Edildi' },
  { value: 'karsiliksiz', label: 'Karşılıksız' },
]

const TIP_OPTIONS: Array<{ value: EvrakTipi | ''; label: string }> = [
  { value: '', label: 'Tüm Tipler' },
  { value: 'cek', label: 'Çek' },
  { value: 'senet', label: 'Senet' },
]

// ============================================
// Helper Functions
// ============================================

function getBugun(): string {
  return new Date().toISOString().split('T')[0]
}

function getSonXGun(gun: number): string {
  const tarih = new Date()
  tarih.setDate(tarih.getDate() - gun)
  return tarih.toISOString().split('T')[0]
}

function getAyBaslangic(): string {
  const tarih = new Date()
  tarih.setDate(1)
  return tarih.toISOString().split('T')[0]
}

function getAySonu(): string {
  const tarih = new Date()
  tarih.setMonth(tarih.getMonth() + 1)
  tarih.setDate(0)
  return tarih.toISOString().split('T')[0]
}

// ============================================
// StatCard Component
// ============================================

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ReactNode
  color: 'blue' | 'green' | 'amber' | 'red' | 'violet'
}

function StatCard({ title, value, subtitle, icon, color }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
    violet: 'bg-violet-50 text-violet-600',
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
        <div>
          <Text className="text-sm text-zinc-500">{title}</Text>
          <div className="text-xl font-semibold text-zinc-900">{value}</div>
          {subtitle && (
            <Text className="text-xs text-zinc-500">{subtitle}</Text>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================
// Main Component
// ============================================

export default function RaporlarPage() {
  const router = useRouter()
  
  // Filtre state
  const [baslangic, setBaslangic] = useState(getAyBaslangic())
  const [bitis, setBitis] = useState(getAySonu())
  const [durum, setDurum] = useState('')
  const [evrakTipi, setEvrakTipi] = useState('')
  const [search, setSearch] = useState('')
  
  // Data state
  const [evraklar, setEvraklar] = useState<Evrak[]>([])
  const [ozet, setOzet] = useState<RaporOzet | null>(null)
  
  // Loading states
  const [isLoading, setIsLoading] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ============================================
  // Handlers
  // ============================================

  const hesaplaOzet = (data: Evrak[]): RaporOzet => {
    const ozet: RaporOzet = {
      toplam: { adet: 0, tutar: 0 },
      cek: { adet: 0, tutar: 0 },
      senet: { adet: 0, tutar: 0 },
    }
    
    for (const evrak of data) {
      // TRY karşılığı hesapla
      const tryTutar = evrak.para_birimi === 'TRY' 
        ? evrak.tutar 
        : evrak.tutar * (evrak.doviz_kuru || 1)
      
      ozet.toplam.adet++
      ozet.toplam.tutar += tryTutar
      
      if (evrak.evrak_tipi === 'cek') {
        ozet.cek.adet++
        ozet.cek.tutar += tryTutar
      } else {
        ozet.senet.adet++
        ozet.senet.tutar += tryTutar
      }
    }
    
    return ozet
  }

  const handleRaporOlustur = useCallback(async () => {
    if (!baslangic || !bitis) {
      setError('Başlangıç ve bitiş tarihi seçmelisiniz')
      return
    }

    if (new Date(baslangic) > new Date(bitis)) {
      setError('Başlangıç tarihi bitiş tarihinden büyük olamaz')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Query params oluştur
      const params = new URLSearchParams()
      params.set('vade_baslangic', baslangic)
      params.set('vade_bitis', bitis)
      params.set('limit', '1000') // Tüm sonuçları al
      
      if (durum) params.set('durum', durum)
      if (evrakTipi) params.set('evrak_tipi', evrakTipi)
      if (search) params.set('search', search)
      
      const response = await fetch(`/api/evraklar?${params.toString()}`)
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Rapor oluşturulamadı')
      }
      
      const data = result.data || []
      setEvraklar(data)
      setOzet(hesaplaOzet(data))
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rapor oluşturulurken hata oluştu')
      setEvraklar([])
      setOzet(null)
    } finally {
      setIsLoading(false)
    }
  }, [baslangic, bitis, durum, evrakTipi, search])

  const handleExcelExport = async () => {
    if (evraklar.length === 0) {
      setError('Excel export için önce rapor oluşturmalısınız')
      return
    }

    setIsExporting(true)
    setError(null)

    try {
      // Query params oluştur
      const params = new URLSearchParams()
      params.set('vade_baslangic', baslangic)
      params.set('vade_bitis', bitis)
      
      if (durum) params.set('durum', durum)
      if (evrakTipi) params.set('evrak_tipi', evrakTipi)
      if (search) params.set('search', search)
      
      const response = await fetch(`/api/raporlar/excel?${params.toString()}`)
      
      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Excel export başarısız')
      }
      
      // Blob olarak indir
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `evraklar_${baslangic}_${bitis}.xlsx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Excel export sırasında hata oluştu')
    } finally {
      setIsExporting(false)
    }
  }

  // Hızlı tarih seçimleri
  const handleHizliTarih = (tip: 'bugun' | 'bu-hafta' | 'bu-ay' | 'son-30' | 'son-90') => {
    const bugun = getBugun()
    switch (tip) {
      case 'bugun':
        setBaslangic(bugun)
        setBitis(bugun)
        break
      case 'bu-hafta':
        setBaslangic(getSonXGun(7))
        setBitis(bugun)
        break
      case 'bu-ay':
        setBaslangic(getAyBaslangic())
        setBitis(getAySonu())
        break
      case 'son-30':
        setBaslangic(getSonXGun(30))
        setBitis(bugun)
        break
      case 'son-90':
        setBaslangic(getSonXGun(90))
        setBitis(bugun)
        break
    }
  }

  // ============================================
  // Render
  // ============================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Heading>Raporlar</Heading>
        <Text className="mt-1">Çek ve senet raporları oluşturun, Excel'e aktarın</Text>
      </div>

      {/* Filtreler */}
      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        {/* Hızlı Seçim */}
        <div className="mb-4 flex flex-wrap gap-2">
          <Text className="w-full text-sm font-medium text-zinc-700">
            Hızlı Seçim:
          </Text>
          <Button outline onClick={() => handleHizliTarih('bugun')}>
            Bugün
          </Button>
          <Button outline onClick={() => handleHizliTarih('bu-hafta')}>
            Son 7 Gün
          </Button>
          <Button outline onClick={() => handleHizliTarih('bu-ay')}>
            Bu Ay
          </Button>
          <Button outline onClick={() => handleHizliTarih('son-30')}>
            Son 30 Gün
          </Button>
          <Button outline onClick={() => handleHizliTarih('son-90')}>
            Son 90 Gün
          </Button>
        </div>

        {/* Filtre Alanları */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">
              Başlangıç Tarihi
            </label>
            <Input
              type="date"
              value={baslangic}
              onChange={(e) => setBaslangic(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">
              Bitiş Tarihi
            </label>
            <Input
              type="date"
              value={bitis}
              onChange={(e) => setBitis(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">
              Durum
            </label>
            <Select value={durum} onChange={(e) => setDurum(e.target.value)}>
              {DURUM_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">
              Evrak Tipi
            </label>
            <Select value={evrakTipi} onChange={(e) => setEvrakTipi(e.target.value)}>
              {TIP_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">
              Arama
            </label>
            <Input
              type="text"
              placeholder="Evrak no, keşideci..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-end">
            <Button
              color="blue"
              onClick={handleRaporOlustur}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <ArrowPathIcon className="h-5 w-5 animate-spin" />
              ) : (
                <ChartBarIcon className="h-5 w-5" />
              )}
              Rapor Oluştur
            </Button>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          <div className="flex items-center gap-2">
            <ExclamationTriangleIcon className="h-5 w-5" />
            {error}
          </div>
        </div>
      )}

      {/* Rapor Sonuçları */}
      {ozet && (
        <>
          {/* Özet Kartları */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              title="Toplam Evrak"
              value={ozet.toplam.adet}
              icon={<DocumentTextIcon className="h-5 w-5" />}
              color="blue"
            />
            <StatCard
              title="Toplam Tutar"
              value={formatCurrency(ozet.toplam.tutar)}
              icon={<CurrencyDollarIcon className="h-5 w-5" />}
              color="green"
            />
            <StatCard
              title="Çek"
              value={ozet.cek.adet}
              subtitle={formatCurrency(ozet.cek.tutar)}
              icon={<DocumentChartBarIcon className="h-5 w-5" />}
              color="violet"
            />
            <StatCard
              title="Senet"
              value={ozet.senet.adet}
              subtitle={formatCurrency(ozet.senet.tutar)}
              icon={<DocumentChartBarIcon className="h-5 w-5" />}
              color="amber"
            />
          </div>

          {/* Excel Export Butonu */}
          {evraklar.length > 0 && (
            <div className="flex justify-end">
              <Button
                color="green"
                onClick={handleExcelExport}
                disabled={isExporting}
              >
                {isExporting ? (
                  <ArrowPathIcon className="h-5 w-5 animate-spin" />
                ) : (
                  <ArrowDownTrayIcon className="h-5 w-5" />
                )}
                Excel İndir ({evraklar.length} evrak)
              </Button>
            </div>
          )}

          {/* Detay Tablosu */}
          {evraklar.length > 0 ? (
            <div className="rounded-lg border border-zinc-200 bg-white">
              <Table striped>
                <TableHead>
                  <TableRow>
                    <TableHeader>Durum</TableHeader>
                    <TableHeader>Tip</TableHeader>
                    <TableHeader>Evrak No</TableHeader>
                    <TableHeader>Tutar</TableHeader>
                    <TableHeader>Vade Tarihi</TableHeader>
                    <TableHeader>Keşideci</TableHeader>
                    <TableHeader>Cari</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {evraklar.map((evrak) => (
                    <TableRow 
                      key={evrak.id} 
                      href={`/evraklar/${evrak.id}`}
                      className="cursor-pointer hover:bg-zinc-50"
                    >
                      <TableCell>
                        <Badge color={DURUM_COLORS[evrak.durum] as any}>
                          {DURUM_LABELS[evrak.durum]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge color={EVRAK_TIPI_COLORS[evrak.evrak_tipi] as any}>
                          {EVRAK_TIPI_LABELS[evrak.evrak_tipi]}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{evrak.evrak_no}</TableCell>
                      <TableCell className="font-medium text-zinc-900">
                        {formatCurrency(evrak.tutar, evrak.para_birimi)}
                      </TableCell>
                      <TableCell>{formatDate(evrak.vade_tarihi)}</TableCell>
                      <TableCell>{evrak.kesideci || '-'}</TableCell>
                      <TableCell className="text-zinc-500">
                        {evrak.cari?.ad_soyad || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="rounded-lg border border-zinc-200 bg-white p-12 text-center">
              <DocumentTextIcon className="mx-auto h-12 w-12 text-zinc-400" />
              <Text className="mt-4">Seçilen kriterlere uygun evrak bulunamadı.</Text>
            </div>
          )}
        </>
      )}

      {/* Başlangıç Durumu - Rapor henüz oluşturulmadı */}
      {!ozet && !isLoading && !error && (
        <div className="rounded-lg border border-zinc-200 bg-white p-12 text-center">
          <ChartBarIcon className="mx-auto h-12 w-12 text-zinc-400" />
          <Text className="mt-4 font-medium text-zinc-900">Rapor oluşturmak için filtreleri seçin</Text>
          <Text className="mt-2 text-zinc-500">
            Tarih aralığı ve diğer filtreleri belirleyip &quot;Rapor Oluştur&quot; butonuna tıklayın.
          </Text>
        </div>
      )}
    </div>
  )
}
