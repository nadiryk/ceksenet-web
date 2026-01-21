'use client'

// ============================================
// ÇekSenet Web - Evrak Import Sayfası
// Excel'den toplu evrak import
// ============================================

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Heading } from '@/components/ui/heading'
import { Text } from '@/components/ui/text'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeader,
  TableCell,
} from '@/components/ui/table'
import {
  ArrowLeftIcon,
  ArrowDownTrayIcon,
  DocumentArrowUpIcon,
  CloudArrowUpIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  ArrowPathIcon,
  DocumentTextIcon,
  InformationCircleIcon,
} from '@heroicons/react/20/solid'
import { formatCurrency, formatDate } from '@/lib/utils/format'

// ============================================
// Types
// ============================================

type ImportStep = 'template' | 'upload' | 'preview' | 'result'

interface ParsedRow {
  satir: number
  evrak_tipi: string
  evrak_no: string
  tutar: number | null
  para_birimi: string
  doviz_kuru: number | null
  evrak_tarihi: string | null
  vade_tarihi: string | null
  banka_adi: string | null
  kesideci: string | null
  cari_adi: string | null
  durum: string | null
  notlar: string | null
  gecerli: boolean
  hatalar: string[]
  uyarilar: string[]
}

interface ParseSummary {
  toplam: number
  gecerli: number
  hatali: number
  uyarili: number
}

interface ImportResult {
  basarili: number
  basarisiz: number
  hatalar: Array<{ satir: number; hata: string }>
}

// ============================================
// Helper Functions
// ============================================

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

function validateExcelFile(file: File): string | null {
  const validTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
  ]
  const validExtensions = ['.xlsx', '.xls']
  
  const extension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'))
  
  if (!validTypes.includes(file.type) && !validExtensions.includes(extension)) {
    return 'Sadece Excel dosyaları (.xlsx, .xls) kabul edilir'
  }
  
  if (file.size > MAX_FILE_SIZE) {
    return 'Dosya boyutu 5 MB\'dan büyük olamaz'
  }
  
  return null
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

function getRowBadgeColor(row: ParsedRow): 'red' | 'yellow' | 'green' {
  if (!row.gecerli) return 'red'
  if (row.uyarilar.length > 0) return 'yellow'
  return 'green'
}

function getRowStatusText(row: ParsedRow): string {
  if (!row.gecerli) return 'Hatalı'
  if (row.uyarilar.length > 0) return 'Uyarılı'
  return 'Geçerli'
}

// ============================================
// Step Indicator Component
// ============================================

function StepIndicator({ currentStep }: { currentStep: ImportStep }) {
  const steps = [
    { key: 'template', label: '1. Template', icon: ArrowDownTrayIcon },
    { key: 'upload', label: '2. Yükle', icon: CloudArrowUpIcon },
    { key: 'preview', label: '3. Önizle', icon: DocumentTextIcon },
    { key: 'result', label: '4. Sonuç', icon: CheckCircleIcon },
  ]

  const currentIndex = steps.findIndex((s) => s.key === currentStep)

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const Icon = step.icon
          const isActive = step.key === currentStep
          const isCompleted = index < currentIndex

          return (
            <div key={step.key} className="flex flex-1 items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${
                    isActive
                      ? 'border-blue-500 bg-blue-500 text-white'
                      : isCompleted
                        ? 'border-green-500 bg-green-500 text-white'
                        : 'border-zinc-300 bg-white text-zinc-400'
                  }`}
                >
                  {isCompleted ? <CheckCircleIcon className="h-6 w-6" /> : <Icon className="h-5 w-5" />}
                </div>
                <span
                  className={`mt-2 text-xs font-medium ${
                    isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-zinc-400'
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className={`mx-2 h-0.5 flex-1 ${index < currentIndex ? 'bg-green-500' : 'bg-zinc-200'}`} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ============================================
// Main Component
// ============================================

export default function EvrakImportPage() {
  const router = useRouter()

  // Step state
  const [currentStep, setCurrentStep] = useState<ImportStep>('template')

  // Template step state
  const [isDownloading, setIsDownloading] = useState(false)

  // Upload step state
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)

  // Preview step state
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([])
  const [parseSummary, setParseSummary] = useState<ParseSummary | null>(null)
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())

  // Import step state
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)

  // ============================================
  // Template Handlers
  // ============================================

  const handleDownloadTemplate = async () => {
    setIsDownloading(true)
    try {
      const response = await fetch('/api/import/evraklar/template')
      if (!response.ok) {
        throw new Error('Template indirilemedi')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'evrak-import-template.xlsx'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err: any) {
      console.error('Template indirme hatası:', err)
      alert(err?.message || 'Template indirilemedi')
    } finally {
      setIsDownloading(false)
    }
  }

  // ============================================
  // Upload Handlers
  // ============================================

  const handleFile = useCallback((file: File) => {
    setValidationError(null)
    const error = validateExcelFile(file)
    if (error) {
      setValidationError(error)
      setSelectedFile(null)
      return
    }
    setSelectedFile(file)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  const handleUpload = async () => {
    if (!selectedFile) return

    setIsUploading(true)
    setUploadError(null)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const response = await fetch('/api/import/evraklar/parse', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Dosya işlenemedi')
      }

      // API { success: true, data: { success, data (rows), ozet } } döndürüyor
      const parseResult = result.data
      setParsedRows(parseResult.data || [])
      setParseSummary(parseResult.ozet || null)

      // Varsayılan olarak geçerli satırları seç
      const validRowNumbers = new Set<number>(
        (parseResult.data || []).filter((r: ParsedRow) => r.gecerli).map((r: ParsedRow) => r.satir)
      )
      setSelectedRows(validRowNumbers)

      setCurrentStep('preview')
    } catch (err: any) {
      setUploadError(err?.message || 'Dosya yüklenirken bir hata oluştu')
    } finally {
      setIsUploading(false)
    }
  }

  // ============================================
  // Preview Handlers
  // ============================================

  const handleToggleRow = (satir: number) => {
    setSelectedRows((prev) => {
      const next = new Set(prev)
      if (next.has(satir)) {
        next.delete(satir)
      } else {
        next.add(satir)
      }
      return next
    })
  }

  const handleToggleAll = () => {
    if (selectedRows.size === parsedRows.length) {
      setSelectedRows(new Set<number>())
    } else {
      setSelectedRows(new Set<number>(parsedRows.map((r) => r.satir)))
    }
  }

  const handleSelectValid = () => {
    const validRowNumbers = new Set<number>(parsedRows.filter((r) => r.gecerli).map((r) => r.satir))
    setSelectedRows(validRowNumbers)
  }

  const handleImport = async () => {
    setIsImporting(true)

    try {
      // Seçili ve geçerli satırları filtrele
      const rowsToImport = parsedRows.filter((r) => r.gecerli && selectedRows.has(r.satir))

      const response = await fetch('/api/import/evraklar/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ satirlar: rowsToImport }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Import işlemi başarısız')
      }

      setImportResult(result.data.sonuc)
      setCurrentStep('result')
    } catch (err: any) {
      alert(err?.message || 'Import işlemi başarısız oldu')
    } finally {
      setIsImporting(false)
    }
  }

  const handleNewImport = () => {
    setCurrentStep('template')
    setParsedRows([])
    setParseSummary(null)
    setSelectedRows(new Set<number>())
    setImportResult(null)
    setUploadError(null)
    setSelectedFile(null)
    setValidationError(null)
  }

  // ============================================
  // Computed Values
  // ============================================

  const validRows = parsedRows.filter((r) => r.gecerli)
  const selectedValidCount = parsedRows.filter((r) => r.gecerli && selectedRows.has(r.satir)).length

  // ============================================
  // Render
  // ============================================

  return (
    <div className="mx-auto max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <Button plain onClick={() => router.push('/evraklar')} className="mb-4">
          <ArrowLeftIcon className="h-5 w-5" />
          Evraklara Dön
        </Button>
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 text-green-600">
            <DocumentArrowUpIcon className="h-6 w-6" />
          </div>
          <div>
            <Heading>Excel Import</Heading>
            <Text className="mt-1">Excel dosyasından toplu evrak ekleyin</Text>
          </div>
        </div>
      </div>

      {/* Step Indicator */}
      <StepIndicator currentStep={currentStep} />

      {/* ========== STEP 1: TEMPLATE ========== */}
      {currentStep === 'template' && (
        <div className="rounded-lg border border-zinc-200 bg-white p-6">
          <div className="mb-6 flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
              <ArrowDownTrayIcon className="h-6 w-6" />
            </div>
            <div>
              <Heading level={3}>Template Dosyasını İndirin</Heading>
              <Text className="mt-1">
                Excel import işlemi için önce template dosyasını indirin ve evrak bilgilerinizi bu dosyaya girin.
              </Text>
            </div>
          </div>

          <div className="mb-6 rounded-lg bg-blue-50 p-4">
            <div className="flex items-start gap-3">
              <InformationCircleIcon className="h-5 w-5 shrink-0 text-blue-600" />
              <div className="text-sm text-blue-800">
                <p className="font-medium">Template dosyası hakkında:</p>
                <ul className="mt-2 list-inside list-disc space-y-1">
                  <li>İlk satır kolon başlıklarını içerir, silmeyin</li>
                  <li>Örnek veriler referans için eklenmiştir, silebilirsiniz</li>
                  <li>Zorunlu alanlar: Evrak Tipi, Evrak No, Tutar, Vade Tarihi</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <Heading level={4} className="mb-3">
              Kolon Açıklamaları
            </Heading>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200">
                    <th className="py-2 pr-4 text-left font-medium">Kolon</th>
                    <th className="py-2 pr-4 text-left font-medium">Zorunlu</th>
                    <th className="py-2 text-left font-medium">Açıklama</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  <tr><td className="py-2 pr-4">Evrak Tipi</td><td className="py-2 pr-4"><Badge color="red">Evet</Badge></td><td className="py-2">cek veya senet</td></tr>
                  <tr><td className="py-2 pr-4">Evrak No</td><td className="py-2 pr-4"><Badge color="red">Evet</Badge></td><td className="py-2">Benzersiz evrak numarası</td></tr>
                  <tr><td className="py-2 pr-4">Tutar</td><td className="py-2 pr-4"><Badge color="red">Evet</Badge></td><td className="py-2">Sayısal değer (örn: 15000)</td></tr>
                  <tr><td className="py-2 pr-4">Vade Tarihi</td><td className="py-2 pr-4"><Badge color="red">Evet</Badge></td><td className="py-2">GG.AA.YYYY veya YYYY-AA-GG</td></tr>
                  <tr><td className="py-2 pr-4">Para Birimi</td><td className="py-2 pr-4"><Badge color="zinc">Hayır</Badge></td><td className="py-2">TRY, USD, EUR, GBP (varsayılan: TRY)</td></tr>
                  <tr><td className="py-2 pr-4">Döviz Kuru</td><td className="py-2 pr-4"><Badge color="yellow">Koşullu</Badge></td><td className="py-2">TRY dışında zorunlu</td></tr>
                  <tr><td className="py-2 pr-4">Evrak Tarihi</td><td className="py-2 pr-4"><Badge color="zinc">Hayır</Badge></td><td className="py-2">Düzenlenme tarihi</td></tr>
                  <tr><td className="py-2 pr-4">Banka Adı</td><td className="py-2 pr-4"><Badge color="zinc">Hayır</Badge></td><td className="py-2">Çekler için banka</td></tr>
                  <tr><td className="py-2 pr-4">Keşideci</td><td className="py-2 pr-4"><Badge color="zinc">Hayır</Badge></td><td className="py-2">Veren kişi/firma</td></tr>
                  <tr><td className="py-2 pr-4">Cari Adı</td><td className="py-2 pr-4"><Badge color="zinc">Hayır</Badge></td><td className="py-2">Sistemdeki cari ile eşleşir</td></tr>
                  <tr><td className="py-2 pr-4">Durum</td><td className="py-2 pr-4"><Badge color="zinc">Hayır</Badge></td><td className="py-2">portfoy, bankada, ciro, tahsil, karsiliksiz</td></tr>
                  <tr><td className="py-2 pr-4">Notlar</td><td className="py-2 pr-4"><Badge color="zinc">Hayır</Badge></td><td className="py-2">Ek bilgiler</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex gap-4">
            <Button color="blue" onClick={handleDownloadTemplate} disabled={isDownloading}>
              <ArrowDownTrayIcon className="h-5 w-5" />
              {isDownloading ? 'İndiriliyor...' : 'Template İndir'}
            </Button>
            <Button outline onClick={() => setCurrentStep('upload')}>
              Dosya Yüklemeye Geç
            </Button>
          </div>
        </div>
      )}

      {/* ========== STEP 2: UPLOAD ========== */}
      {currentStep === 'upload' && (
        <div className="rounded-lg border border-zinc-200 bg-white p-6">
          <div className="mb-6 flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
              <CloudArrowUpIcon className="h-6 w-6" />
            </div>
            <div>
              <Heading level={3}>Excel Dosyasını Yükleyin</Heading>
              <Text className="mt-1">
                Doldurduğunuz Excel dosyasını yükleyin. Sistem dosyayı analiz edecek ve önizleme gösterecektir.
              </Text>
            </div>
          </div>

          {/* Drop Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`mb-6 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
              isDragOver
                ? 'border-blue-400 bg-blue-50'
                : selectedFile
                  ? 'border-green-400 bg-green-50'
                  : 'border-zinc-300 bg-zinc-50 hover:border-zinc-400 hover:bg-zinc-100'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleInputChange}
              className="hidden"
            />

            {selectedFile ? (
              <>
                <DocumentArrowUpIcon className="mb-3 h-12 w-12 text-green-500" />
                <p className="font-medium text-green-700">{selectedFile.name}</p>
                <p className="mt-1 text-sm text-green-600">{formatFileSize(selectedFile.size)}</p>
                <p className="mt-2 text-xs text-zinc-500">Başka dosya seçmek için tıklayın</p>
              </>
            ) : (
              <>
                <CloudArrowUpIcon className="mb-3 h-12 w-12 text-zinc-400" />
                <p className="font-medium text-zinc-700">Dosyayı sürükleyip bırakın</p>
                <p className="mt-1 text-sm text-zinc-500">veya seçmek için tıklayın</p>
                <p className="mt-3 text-xs text-zinc-400">Desteklenen formatlar: .xlsx, .xls (maks. 5 MB)</p>
              </>
            )}
          </div>

          {/* Validation Error */}
          {validationError && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
              <div className="flex items-center gap-2 text-red-700">
                <XCircleIcon className="h-5 w-5" />
                <span>{validationError}</span>
              </div>
            </div>
          )}

          {/* Upload Error */}
          {uploadError && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
              <div className="flex items-center gap-2 text-red-700">
                <XCircleIcon className="h-5 w-5" />
                <span>{uploadError}</span>
              </div>
            </div>
          )}

          <div className="flex gap-4">
            <Button outline onClick={() => setCurrentStep('template')} disabled={isUploading}>
              <ArrowLeftIcon className="h-5 w-5" />
              Geri
            </Button>
            <Button color="blue" onClick={handleUpload} disabled={!selectedFile || isUploading}>
              {isUploading ? (
                <>
                  <ArrowPathIcon className="h-5 w-5 animate-spin" />
                  Analiz Ediliyor...
                </>
              ) : (
                <>
                  <DocumentArrowUpIcon className="h-5 w-5" />
                  Yükle ve Analiz Et
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* ========== STEP 3: PREVIEW ========== */}
      {currentStep === 'preview' && parseSummary && (
        <div className="rounded-lg border border-zinc-200 bg-white p-6">
          <div className="mb-6 flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
              <DocumentTextIcon className="h-6 w-6" />
            </div>
            <div>
              <Heading level={3}>Önizleme</Heading>
              <Text className="mt-1">
                Verilerinizi kontrol edin. Hatalı satırları düzelterek tekrar yükleyebilir veya geçerli olanları import
                edebilirsiniz.
              </Text>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-lg bg-zinc-100 p-4 text-center">
              <p className="text-2xl font-bold text-zinc-900">{parseSummary.toplam}</p>
              <p className="text-sm text-zinc-600">Toplam Satır</p>
            </div>
            <div className="rounded-lg bg-green-100 p-4 text-center">
              <p className="text-2xl font-bold text-green-700">{parseSummary.gecerli}</p>
              <p className="text-sm text-green-600">Geçerli</p>
            </div>
            <div className="rounded-lg bg-yellow-100 p-4 text-center">
              <p className="text-2xl font-bold text-yellow-700">{parseSummary.uyarili}</p>
              <p className="text-sm text-yellow-600">Uyarılı</p>
            </div>
            <div className="rounded-lg bg-red-100 p-4 text-center">
              <p className="text-2xl font-bold text-red-700">{parseSummary.hatali}</p>
              <p className="text-sm text-red-600">Hatalı</p>
            </div>
          </div>

          {/* Selection Buttons */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Button outline onClick={handleToggleAll}>
              {selectedRows.size === parsedRows.length ? 'Hiçbirini Seçme' : 'Tümünü Seç'}
            </Button>
            <Button outline onClick={handleSelectValid}>
              Geçerli Olanları Seç ({validRows.length})
            </Button>
            <span className="ml-auto text-sm text-zinc-600">{selectedValidCount} geçerli satır seçili</span>
          </div>

          {/* Preview Table */}
          <div className="mb-6 overflow-x-auto rounded-lg border border-zinc-200">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader className="w-12">
                    <Checkbox checked={selectedRows.size === parsedRows.length} onChange={handleToggleAll} />
                  </TableHeader>
                  <TableHeader className="w-16">Satır</TableHeader>
                  <TableHeader className="w-24">Durum</TableHeader>
                  <TableHeader>Evrak No</TableHeader>
                  <TableHeader>Tip</TableHeader>
                  <TableHeader className="text-right">Tutar</TableHeader>
                  <TableHeader>Vade</TableHeader>
                  <TableHeader>Hata/Uyarı</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {parsedRows.map((row) => (
                  <TableRow
                    key={row.satir}
                    className={!row.gecerli ? 'bg-red-50' : row.uyarilar.length > 0 ? 'bg-yellow-50' : 'bg-green-50'}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedRows.has(row.satir)}
                        onChange={() => handleToggleRow(row.satir)}
                        disabled={!row.gecerli}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{row.satir}</TableCell>
                    <TableCell>
                      <Badge color={getRowBadgeColor(row)}>{getRowStatusText(row)}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{row.evrak_no || '-'}</TableCell>
                    <TableCell>{row.evrak_tipi === 'cek' ? 'Çek' : row.evrak_tipi === 'senet' ? 'Senet' : '-'}</TableCell>
                    <TableCell className="text-right">
                      {row.tutar ? formatCurrency(row.tutar, row.para_birimi || 'TRY') : '-'}
                    </TableCell>
                    <TableCell>{row.vade_tarihi ? formatDate(row.vade_tarihi) : '-'}</TableCell>
                    <TableCell className="max-w-xs">
                      {row.hatalar.length > 0 && (
                        <div className="flex items-start gap-1 text-sm text-red-600">
                          <XCircleIcon className="mt-0.5 h-4 w-4 shrink-0" />
                          <span>{row.hatalar.join(', ')}</span>
                        </div>
                      )}
                      {row.uyarilar.length > 0 && (
                        <div className="flex items-start gap-1 text-sm text-yellow-600">
                          <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
                          <span>{row.uyarilar.join(', ')}</span>
                        </div>
                      )}
                      {row.hatalar.length === 0 && row.uyarilar.length === 0 && (
                        <span className="text-sm text-green-600">Hazır</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <Button outline onClick={() => setCurrentStep('upload')} disabled={isImporting}>
              <ArrowLeftIcon className="h-5 w-5" />
              Farklı Dosya Yükle
            </Button>
            <Button color="blue" onClick={handleImport} disabled={selectedValidCount === 0 || isImporting}>
              {isImporting ? (
                <>
                  <ArrowPathIcon className="h-5 w-5 animate-spin" />
                  Import Ediliyor...
                </>
              ) : (
                <>
                  <CheckCircleIcon className="h-5 w-5" />
                  {selectedValidCount} Evrak Import Et
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* ========== STEP 4: RESULT ========== */}
      {currentStep === 'result' && importResult && (
        <div className="rounded-lg border border-zinc-200 bg-white p-6">
          <div className="mb-6 flex items-start gap-4">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${
                importResult.basarisiz > 0 ? 'bg-yellow-100 text-yellow-600' : 'bg-green-100 text-green-600'
              }`}
            >
              {importResult.basarisiz > 0 ? (
                <ExclamationTriangleIcon className="h-6 w-6" />
              ) : (
                <CheckCircleIcon className="h-6 w-6" />
              )}
            </div>
            <div>
              <Heading level={3}>
                {importResult.basarisiz > 0 ? 'Import Kısmen Tamamlandı' : 'Import Başarılı!'}
              </Heading>
              <Text className="mt-1">
                {importResult.basarisiz > 0
                  ? 'Bazı evraklar import edilemedi. Detayları aşağıda görebilirsiniz.'
                  : 'Tüm evraklar başarıyla sisteme eklendi.'}
              </Text>
            </div>
          </div>

          {/* Result Summary */}
          <div className="mb-6 grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-green-100 p-4 text-center">
              <p className="text-3xl font-bold text-green-700">{importResult.basarili}</p>
              <p className="text-sm text-green-600">Başarılı</p>
            </div>
            <div className="rounded-lg bg-red-100 p-4 text-center">
              <p className="text-3xl font-bold text-red-700">{importResult.basarisiz}</p>
              <p className="text-sm text-red-600">Başarısız</p>
            </div>
          </div>

          {/* Errors Detail */}
          {importResult.hatalar && importResult.hatalar.length > 0 && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
              <Heading level={4} className="mb-3 text-red-700">
                Hata Detayları
              </Heading>
              <ul className="space-y-2">
                {importResult.hatalar.map((hata, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-red-600">
                    <XCircleIcon className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                      <strong>Satır {hata.satir}:</strong> {hata.hata}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-4">
            <Button outline onClick={handleNewImport}>
              <DocumentArrowUpIcon className="h-5 w-5" />
              Yeni Import
            </Button>
            <Button color="blue" onClick={() => router.push('/evraklar')}>
              <ArrowLeftIcon className="h-5 w-5" />
              Evrak Listesine Git
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
