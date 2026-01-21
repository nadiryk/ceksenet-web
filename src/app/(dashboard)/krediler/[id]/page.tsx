'use client'

// ============================================
// ÇekSenet Web - Kredi Detay Sayfası
// ============================================

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Heading } from '@/components/ui/heading'
import { Text } from '@/components/ui/text'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Divider } from '@/components/ui/divider'
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
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Field, Label, Description } from '@/components/ui/fieldset'
import {
  ArrowLeftIcon,
  PencilSquareIcon,
  TrashIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  BanknotesIcon,
  CalendarDaysIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/20/solid'
import {
  formatCurrency,
  formatDate,
  getKrediDurumLabel,
  getKrediDurumColor,
  getTaksitDurumLabel,
  getTaksitDurumColor,
} from '@/lib/utils/format'
import { useAuth } from '@/lib/hooks/useAuth'

// ============================================
// Types
// ============================================

interface KrediTaksit {
  id: number
  kredi_id: number
  taksit_no: number
  vade_tarihi: string
  tutar: number
  durum: string
  odeme_tarihi: string | null
  odenen_tutar: number | null
  notlar: string | null
}

interface KrediOzet {
  toplam_taksit: number
  odenen_taksit: number
  kalan_taksit: number
  geciken_taksit: number
  odenen_tutar: number
  kalan_borc: number
  geciken_tutar: number
}

interface KrediDetay {
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
  taksitler: KrediTaksit[]
  ozet: KrediOzet
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
// Progress Bar Component
// ============================================

interface ProgressBarProps {
  current: number
  total: number
  showLabel?: boolean
}

function ProgressBar({ current, total, showLabel = true }: ProgressBarProps) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0

  return (
    <div className="space-y-2">
      <div className="h-3 rounded-full bg-zinc-200">
        <div
          className="h-3 rounded-full bg-green-500 transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between text-sm">
          <span className="text-zinc-600">{current} / {total} taksit ödendi</span>
          <span className="font-medium text-zinc-900">%{percentage}</span>
        </div>
      )}
    </div>
  )
}

// ============================================
// Stat Card Component
// ============================================

interface StatCardProps {
  title: string
  value: string
  icon: React.ReactNode
  color?: 'default' | 'green' | 'blue' | 'amber' | 'red'
}

function StatCard({ title, value, icon, color = 'default' }: StatCardProps) {
  const colorClasses = {
    default: 'bg-zinc-50 text-zinc-600',
    green: 'bg-green-50 text-green-600',
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="flex items-center gap-3">
        <div className={`rounded-lg p-2 ${colorClasses[color]}`}>
          {icon}
        </div>
        <div>
          <Text className="text-sm text-zinc-500">{title}</Text>
          <Text className="text-lg font-semibold text-zinc-900">{value}</Text>
        </div>
      </div>
    </div>
  )
}

// ============================================
// Component
// ============================================

export default function KrediDetayPage() {
  const params = useParams()
  const router = useRouter()
  const { isAdmin } = useAuth()
  const krediId = Number(params.id)

  // State
  const [kredi, setKredi] = useState<KrediDetay | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Taksit ödeme modal state
  const [isTaksitModalOpen, setIsTaksitModalOpen] = useState(false)
  const [selectedTaksit, setSelectedTaksit] = useState<KrediTaksit | null>(null)
  const [odemeTarihi, setOdemeTarihi] = useState(new Date().toISOString().split('T')[0])
  const [odenenTutar, setOdenenTutar] = useState('')
  const [odemeNotlar, setOdemeNotlar] = useState('')
  const [isTaksitOdeniyor, setIsTaksitOdeniyor] = useState(false)
  const [taksitHata, setTaksitHata] = useState<string | null>(null)

  // Erken ödeme modal state
  const [isErkenOdemeModalOpen, setIsErkenOdemeModalOpen] = useState(false)
  const [erkenOdemeTarihi, setErkenOdemeTarihi] = useState(new Date().toISOString().split('T')[0])
  const [erkenOdemeNotlar, setErkenOdemeNotlar] = useState('')
  const [isErkenOdemeYapiliyor, setIsErkenOdemeYapiliyor] = useState(false)
  const [erkenOdemeHata, setErkenOdemeHata] = useState<string | null>(null)

  // Silme dialog state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // ============================================
  // Data Fetching
  // ============================================

  const fetchKredi = useCallback(async () => {
    if (!krediId || isNaN(krediId)) {
      setError('Geçersiz kredi ID')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/krediler/${krediId}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Kredi yüklenirken hata oluştu')
      }

      setKredi(result.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kredi yüklenirken hata oluştu')
    } finally {
      setIsLoading(false)
    }
  }, [krediId])

  useEffect(() => {
    fetchKredi()
  }, [fetchKredi])

  // Clear success message after 5 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [successMessage])

  // ============================================
  // Taksit Ödeme
  // ============================================

  const handleOpenTaksitModal = (taksit: KrediTaksit) => {
    setSelectedTaksit(taksit)
    setOdemeTarihi(new Date().toISOString().split('T')[0])
    setOdenenTutar(taksit.tutar.toString())
    setOdemeNotlar('')
    setTaksitHata(null)
    setIsTaksitModalOpen(true)
  }

  const handleCloseTaksitModal = () => {
    setIsTaksitModalOpen(false)
    setSelectedTaksit(null)
    setTaksitHata(null)
  }

  const handleTaksitOde = async () => {
    if (!selectedTaksit || !kredi) return

    setIsTaksitOdeniyor(true)
    setTaksitHata(null)

    try {
      const response = await fetch(`/api/krediler/${krediId}/taksitler/${selectedTaksit.id}/ode`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          odeme_tarihi: odemeTarihi || undefined,
          odenen_tutar: odenenTutar ? parseFloat(odenenTutar) : undefined,
          notlar: odemeNotlar || undefined,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Ödeme kaydedilemedi')
      }

      await fetchKredi()
      handleCloseTaksitModal()
      setSuccessMessage('Taksit ödemesi başarıyla kaydedildi')
    } catch (err) {
      setTaksitHata(err instanceof Error ? err.message : 'Ödeme kaydedilemedi')
    } finally {
      setIsTaksitOdeniyor(false)
    }
  }

  // ============================================
  // Erken Ödeme
  // ============================================

  const handleOpenErkenOdemeModal = () => {
    setErkenOdemeTarihi(new Date().toISOString().split('T')[0])
    setErkenOdemeNotlar('')
    setErkenOdemeHata(null)
    setIsErkenOdemeModalOpen(true)
  }

  const handleCloseErkenOdemeModal = () => {
    setIsErkenOdemeModalOpen(false)
    setErkenOdemeHata(null)
  }

  const handleErkenOdeme = async () => {
    if (!kredi) return

    setIsErkenOdemeYapiliyor(true)
    setErkenOdemeHata(null)

    try {
      const response = await fetch(`/api/krediler/${krediId}/erken-odeme`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          odeme_tarihi: erkenOdemeTarihi || undefined,
          notlar: erkenOdemeNotlar || undefined,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erken ödeme yapılamadı')
      }

      await fetchKredi()
      handleCloseErkenOdemeModal()
      setSuccessMessage(`Erken ödeme tamamlandı. ${result.data.odenen_taksit_sayisi} taksit ödendi.`)
    } catch (err) {
      setErkenOdemeHata(err instanceof Error ? err.message : 'Erken ödeme yapılamadı')
    } finally {
      setIsErkenOdemeYapiliyor(false)
    }
  }

  // ============================================
  // Silme İşlemi
  // ============================================

  const handleDelete = async () => {
    if (!kredi) return

    setIsDeleting(true)

    try {
      const response = await fetch(`/api/krediler/${krediId}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Kredi silinemedi')
      }

      router.push('/krediler')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kredi silinemedi')
      setIsDeleteDialogOpen(false)
    } finally {
      setIsDeleting(false)
    }
  }

  // ============================================
  // Helpers
  // ============================================

  const getTaksitRowClass = (durum: string): string => {
    switch (durum) {
      case 'odendi':
        return 'bg-green-50'
      case 'gecikti':
        return 'bg-red-50'
      default:
        return ''
    }
  }

  const getBitisTarihi = (baslangic: string, vadeAy: number): string => {
    const tarih = new Date(baslangic)
    tarih.setMonth(tarih.getMonth() + vadeAy)
    return tarih.toISOString().split('T')[0]
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

  if (error || !kredi) {
    return (
      <div className="space-y-4">
        <Button outline onClick={() => router.push('/krediler')}>
          <ArrowLeftIcon className="h-5 w-5" />
          Listeye Dön
        </Button>
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400" />
          <Text className="mt-4 text-red-700">
            {error || 'Kredi bulunamadı'}
          </Text>
        </div>
      </div>
    )
  }

  // ============================================
  // Render - Main
  // ============================================

  const isAktif = kredi.durum === 'aktif'
  const kalanTaksitler = kredi.taksitler.filter(t => t.durum !== 'odendi')

  return (
    <div className="space-y-6">
      {/* Success Message */}
      {successMessage && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-4 text-green-700">
          <CheckCircleIcon className="h-5 w-5" />
          {successMessage}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <Button outline onClick={() => router.push('/krediler')}>
            <ArrowLeftIcon className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <Heading>{kredi.banka?.ad || 'Banka Belirtilmemiş'}</Heading>
              <Badge color={getKrediDurumColor(kredi.durum)}>
                {getKrediDurumLabel(kredi.durum)}
              </Badge>
            </div>
            <Text className="mt-1">
              {KREDI_TURU_LABELS[kredi.kredi_turu]} • {formatCurrency(kredi.anapara, kredi.para_birimi)}
            </Text>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {isAktif && kalanTaksitler.length > 0 && (
            <Button color="green" onClick={handleOpenErkenOdemeModal}>
              <CurrencyDollarIcon className="h-5 w-5" />
              Erken Ödeme
            </Button>
          )}
          <Button outline onClick={() => router.push(`/krediler/${krediId}/duzenle`)}>
            <PencilSquareIcon className="h-5 w-5" />
            Düzenle
          </Button>
          {isAdmin && (
            <Button color="red" onClick={() => setIsDeleteDialogOpen(true)}>
              <TrashIcon className="h-5 w-5" />
              Sil
            </Button>
          )}
        </div>
      </div>

      {/* Özet Kartları */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Anapara"
          value={formatCurrency(kredi.anapara, kredi.para_birimi)}
          icon={<BanknotesIcon className="h-5 w-5" />}
          color="blue"
        />
        <StatCard
          title="Toplam Ödeme"
          value={formatCurrency(kredi.toplam_odeme, kredi.para_birimi)}
          icon={<CurrencyDollarIcon className="h-5 w-5" />}
          color="default"
        />
        <StatCard
          title="Kalan Borç"
          value={formatCurrency(kredi.ozet.kalan_borc, kredi.para_birimi)}
          icon={<CalendarDaysIcon className="h-5 w-5" />}
          color={kredi.ozet.kalan_borc > 0 ? 'amber' : 'green'}
        />
        <StatCard
          title="Ödenen Tutar"
          value={formatCurrency(kredi.ozet.odenen_tutar, kredi.para_birimi)}
          icon={<CheckCircleIcon className="h-5 w-5" />}
          color="green"
        />
      </div>

      {/* Kredi Bilgileri & Progress */}
      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <Heading level={2} className="text-lg">Kredi Özeti</Heading>
        <Divider className="my-4" />

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <div>
            <Text className="text-xs text-zinc-500">Faiz Oranı</Text>
            <Text className="font-medium">%{kredi.faiz_orani.toFixed(2)}</Text>
          </div>
          <div>
            <Text className="text-xs text-zinc-500">Vade</Text>
            <Text className="font-medium">{kredi.vade_ay} ay</Text>
          </div>
          <div>
            <Text className="text-xs text-zinc-500">Aylık Taksit</Text>
            <Text className="font-medium">{formatCurrency(kredi.aylik_taksit, kredi.para_birimi)}</Text>
          </div>
          <div>
            <Text className="text-xs text-zinc-500">Başlangıç</Text>
            <Text className="font-medium">{formatDate(kredi.baslangic_tarihi)}</Text>
          </div>
          <div>
            <Text className="text-xs text-zinc-500">Bitiş (Tahmini)</Text>
            <Text className="font-medium">{formatDate(getBitisTarihi(kredi.baslangic_tarihi, kredi.vade_ay))}</Text>
          </div>
          <div>
            <Text className="text-xs text-zinc-500">Toplam Faiz</Text>
            <Text className="font-medium">{formatCurrency(kredi.toplam_odeme - kredi.anapara, kredi.para_birimi)}</Text>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-6">
          <ProgressBar
            current={kredi.ozet.odenen_taksit}
            total={kredi.ozet.toplam_taksit}
          />
        </div>

        {/* Geciken Taksit Uyarısı */}
        {kredi.ozet.geciken_taksit > 0 && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">
            <ExclamationTriangleIcon className="h-5 w-5" />
            <Text className="text-sm">
              <strong>{kredi.ozet.geciken_taksit}</strong> gecikmiş taksit var! 
              Toplam: {formatCurrency(kredi.ozet.geciken_tutar, kredi.para_birimi)}
            </Text>
          </div>
        )}

        {/* Notlar */}
        {kredi.notlar && (
          <div className="mt-4">
            <Text className="text-xs text-zinc-500">Notlar</Text>
            <Text className="mt-1 whitespace-pre-wrap text-zinc-700">{kredi.notlar}</Text>
          </div>
        )}
      </div>

      {/* Taksit Tablosu */}
      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <Heading level={2} className="text-lg">
            Taksitler
            <span className="ml-2 text-sm font-normal text-zinc-500">
              ({kredi.taksitler.length} adet)
            </span>
          </Heading>
          <Button outline onClick={fetchKredi}>
            <ArrowPathIcon className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
            Yenile
          </Button>
        </div>
        <Divider className="my-4" />

        <div className="overflow-x-auto">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader className="w-16">No</TableHeader>
                <TableHeader>Vade Tarihi</TableHeader>
                <TableHeader>Tutar</TableHeader>
                <TableHeader>Durum</TableHeader>
                <TableHeader>Ödeme Tarihi</TableHeader>
                <TableHeader>Ödenen</TableHeader>
                <TableHeader className="text-right">İşlem</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {kredi.taksitler.map((taksit) => (
                <TableRow key={taksit.id} className={getTaksitRowClass(taksit.durum)}>
                  <TableCell className="font-medium">{taksit.taksit_no}</TableCell>
                  <TableCell>{formatDate(taksit.vade_tarihi)}</TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(taksit.tutar, kredi.para_birimi)}
                  </TableCell>
                  <TableCell>
                    <Badge color={getTaksitDurumColor(taksit.durum)}>
                      {getTaksitDurumLabel(taksit.durum)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {taksit.odeme_tarihi ? formatDate(taksit.odeme_tarihi) : '-'}
                  </TableCell>
                  <TableCell>
                    {taksit.odenen_tutar ? formatCurrency(taksit.odenen_tutar, kredi.para_birimi) : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    {taksit.durum !== 'odendi' && (
                      <Button
                        color="green"
                        onClick={() => handleOpenTaksitModal(taksit)}
                      >
                        Öde
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Taksit Ödeme Modal */}
      <Dialog open={isTaksitModalOpen} onClose={handleCloseTaksitModal}>
        <DialogTitle>Taksit Öde</DialogTitle>
        <DialogDescription>
          {selectedTaksit && (
            <>Taksit #{selectedTaksit.taksit_no} ödemesini kaydedin.</>
          )}
        </DialogDescription>

        <DialogBody>
          {taksitHata && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {taksitHata}
            </div>
          )}

          {selectedTaksit && (
            <div className="space-y-4">
              <div className="rounded-lg bg-zinc-50 p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Text className="text-xs text-zinc-500">Vade Tarihi</Text>
                    <Text className="font-medium">{formatDate(selectedTaksit.vade_tarihi)}</Text>
                  </div>
                  <div>
                    <Text className="text-xs text-zinc-500">Taksit Tutarı</Text>
                    <Text className="font-medium">
                      {formatCurrency(selectedTaksit.tutar, kredi.para_birimi)}
                    </Text>
                  </div>
                </div>
              </div>

              <Field>
                <Label>Ödeme Tarihi</Label>
                <Input
                  type="date"
                  value={odemeTarihi}
                  onChange={(e) => setOdemeTarihi(e.target.value)}
                />
                <Description>Varsayılan: Bugün</Description>
              </Field>

              <Field>
                <Label>Ödenen Tutar</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={odenenTutar}
                  onChange={(e) => setOdenenTutar(e.target.value)}
                  placeholder={selectedTaksit.tutar.toString()}
                />
                <Description>Varsayılan: Taksit tutarı</Description>
              </Field>

              <Field>
                <Label>Notlar (İsteğe bağlı)</Label>
                <Textarea
                  value={odemeNotlar}
                  onChange={(e) => setOdemeNotlar(e.target.value)}
                  rows={2}
                  placeholder="Ödeme hakkında not..."
                />
              </Field>
            </div>
          )}
        </DialogBody>

        <DialogActions>
          <Button outline onClick={handleCloseTaksitModal} disabled={isTaksitOdeniyor}>
            İptal
          </Button>
          <Button
            color="green"
            onClick={handleTaksitOde}
            disabled={isTaksitOdeniyor}
          >
            {isTaksitOdeniyor ? (
              <>
                <ArrowPathIcon className="h-5 w-5 animate-spin" />
                Kaydediliyor...
              </>
            ) : (
              <>
                <CheckCircleIcon className="h-5 w-5" />
                Ödemeyi Kaydet
              </>
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Erken Ödeme Modal */}
      <Dialog open={isErkenOdemeModalOpen} onClose={handleCloseErkenOdemeModal}>
        <DialogTitle>Erken Ödeme</DialogTitle>
        <DialogDescription>
          Kalan tüm taksitleri tek seferde ödeyin.
        </DialogDescription>

        <DialogBody>
          {erkenOdemeHata && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {erkenOdemeHata}
            </div>
          )}

          <div className="space-y-4">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-center gap-2 text-amber-700">
                <ExclamationTriangleIcon className="h-5 w-5" />
                <Text className="font-medium">Dikkat!</Text>
              </div>
              <Text className="mt-2 text-sm text-amber-700">
                Bu işlem <strong>{kredi.ozet.kalan_taksit}</strong> adet kalan taksiti ödendi olarak işaretleyecektir.
                Toplam: <strong>{formatCurrency(kredi.ozet.kalan_borc, kredi.para_birimi)}</strong>
              </Text>
            </div>

            <Field>
              <Label>Ödeme Tarihi</Label>
              <Input
                type="date"
                value={erkenOdemeTarihi}
                onChange={(e) => setErkenOdemeTarihi(e.target.value)}
              />
            </Field>

            <Field>
              <Label>Notlar (İsteğe bağlı)</Label>
              <Textarea
                value={erkenOdemeNotlar}
                onChange={(e) => setErkenOdemeNotlar(e.target.value)}
                rows={2}
                placeholder="Erken ödeme hakkında not..."
              />
            </Field>
          </div>
        </DialogBody>

        <DialogActions>
          <Button outline onClick={handleCloseErkenOdemeModal} disabled={isErkenOdemeYapiliyor}>
            İptal
          </Button>
          <Button
            color="green"
            onClick={handleErkenOdeme}
            disabled={isErkenOdemeYapiliyor}
          >
            {isErkenOdemeYapiliyor ? (
              <>
                <ArrowPathIcon className="h-5 w-5 animate-spin" />
                İşleniyor...
              </>
            ) : (
              <>
                <CheckCircleIcon className="h-5 w-5" />
                Erken Ödemeyi Tamamla
              </>
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Silme Onay Dialog */}
      <Dialog open={isDeleteDialogOpen} onClose={() => setIsDeleteDialogOpen(false)}>
        <DialogTitle>
          <div className="flex items-center gap-2 text-red-600">
            <ExclamationTriangleIcon className="h-6 w-6" />
            Krediyi Sil
          </div>
        </DialogTitle>
        <DialogDescription>
          Bu işlem geri alınamaz. Kredi ve tüm taksit kayıtları silinecektir.
        </DialogDescription>
        <DialogBody>
          <Text className="text-sm text-zinc-600">
            <strong>{kredi.banka?.ad || 'Bu kredi'}</strong> - {KREDI_TURU_LABELS[kredi.kredi_turu]} kaydını silmek istediğinizden emin misiniz?
          </Text>
        </DialogBody>
        <DialogActions>
          <Button outline onClick={() => setIsDeleteDialogOpen(false)} disabled={isDeleting}>
            İptal
          </Button>
          <Button color="red" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? 'Siliniyor...' : 'Evet, Sil'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}
