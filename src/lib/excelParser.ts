/**
 * Excel Parser Utility
 * Excel dosyasını parse eder, validate eder ve JSON formatına çevirir.
 */

import ExcelJS from 'exceljs'
import { createClient } from '@/lib/supabase/server'

// Geçerli değerler
export const GECERLI_EVRAK_TIPLERI = ['cek', 'senet']
export const GECERLI_PARA_BIRIMLERI = ['TRY', 'USD', 'EUR', 'GBP', 'CHF']
export const GECERLI_DURUMLAR = ['portfoy', 'bankada', 'ciro', 'tahsil', 'karsiliksiz']

// Kolon mapping (Excel header -> DB field)
const KOLON_MAPPING: Record<string, string> = {
  'evrak tipi': 'evrak_tipi',
  'evrak tipi *': 'evrak_tipi',
  'evrak no': 'evrak_no',
  'evrak no *': 'evrak_no',
  'tutar': 'tutar',
  'tutar *': 'tutar',
  'para birimi': 'para_birimi',
  'döviz kuru': 'doviz_kuru',
  'doviz kuru': 'doviz_kuru',
  'evrak tarihi': 'evrak_tarihi',
  'vade tarihi': 'vade_tarihi',
  'vade tarihi *': 'vade_tarihi',
  'banka adı': 'banka_adi',
  'banka adi': 'banka_adi',
  'keşideci': 'kesideci',
  'kesideci': 'kesideci',
  'cari adı': 'cari_adi',
  'cari adi': 'cari_adi',
  'durum': 'durum',
  'notlar': 'notlar'
}

// Parse edilmiş satır tipi
export interface ParsedRow {
  satir: number
  evrak_tipi?: string
  evrak_no?: string
  tutar?: number
  para_birimi?: string
  doviz_kuru?: number | null
  evrak_tarihi?: string | null
  vade_tarihi?: string
  banka_adi?: string | null
  kesideci?: string | null
  cari_adi?: string | null
  cari_id?: number | null
  durum?: string
  notlar?: string | null
  hatalar: string[]
  uyarilar: string[]
  gecerli: boolean
}

/**
 * Excel serial date'i ISO string'e çevir
 */
function excelSerialToDate(serial: number): string | null {
  if (typeof serial !== 'number' || serial < 1) return null
  
  const excelEpoch = new Date(1899, 11, 30)
  const date = new Date(excelEpoch.getTime() + serial * 86400000)
  
  if (isNaN(date.getTime())) return null
  
  return date.toISOString().split('T')[0]
}

/**
 * Türkçe tarih formatını parse et
 */
function parseTurkishDate(dateStr: string): string | null {
  // GG.AA.YYYY formatı
  const turkishMatch = dateStr.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
  if (turkishMatch) {
    const [, day, month, year] = turkishMatch
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0]
    }
  }
  
  // GG/AA/YYYY formatı
  const slashMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (slashMatch) {
    const [, day, month, year] = slashMatch
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0]
    }
  }
  
  return null
}

/**
 * Herhangi bir tarih formatını parse et
 */
function parseDate(value: unknown): string | null {
  if (!value) return null
  
  // Zaten Date objesi
  if (value instanceof Date) {
    return value.toISOString().split('T')[0]
  }
  
  // Excel serial date (sayı)
  if (typeof value === 'number') {
    return excelSerialToDate(value)
  }
  
  // String formatları
  if (typeof value === 'string') {
    const trimmed = value.trim()
    
    // Türkçe format
    const turkishResult = parseTurkishDate(trimmed)
    if (turkishResult) return turkishResult
    
    // ISO format (YYYY-MM-DD)
    const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
    if (isoMatch) {
      const date = new Date(trimmed)
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0]
      }
    }
    
    // Native parse
    const parsed = new Date(trimmed)
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0]
    }
  }
  
  return null
}

/**
 * Hücre değerini temiz string'e çevir
 */
function cleanCellValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  
  // ExcelJS richText objesi
  if (typeof value === 'object' && value !== null && 'richText' in value) {
    const richText = value as { richText: Array<{ text?: string }> }
    return richText.richText.map(r => r.text || '').join('').trim()
  }
  
  // ExcelJS formula sonucu
  if (typeof value === 'object' && value !== null && 'result' in value) {
    const formula = value as { result: unknown }
    return String(formula.result).trim()
  }
  
  return String(value).trim()
}

/**
 * Tutar değerini parse et
 */
function parseAmount(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  
  if (typeof value === 'number') {
    return value > 0 ? value : null
  }
  
  if (typeof value === 'string') {
    const cleaned = value
      .replace(/[₺$€£¥]/g, '')
      .replace(/\s/g, '')
      .replace(/\./g, '')
      .replace(/,/g, '.')
    
    const num = parseFloat(cleaned)
    return !isNaN(num) && num > 0 ? num : null
  }
  
  return null
}

/**
 * Cari adına göre cari ID bul
 */
async function findCariByName(cariAdi: string): Promise<number | null> {
  if (!cariAdi) return null
  
  const supabase = await createClient()
  
  const { data } = await supabase
    .from('cariler')
    .select('id')
    .ilike('ad_soyad', cariAdi.trim())
    .limit(1)
    .single()
  
  return data?.id || null
}

/**
 * Evrak no'nun var olup olmadığını kontrol et
 */
async function isEvrakNoExists(evrakNo: string): Promise<boolean> {
  if (!evrakNo) return false
  
  const supabase = await createClient()
  
  const { data } = await supabase
    .from('evraklar')
    .select('id')
    .eq('evrak_no', evrakNo.trim())
    .limit(1)
    .single()
  
  return !!data
}

/**
 * Tek bir satırı validate et
 */
async function validateRow(row: Record<string, unknown>, rowIndex: number): Promise<{
  hatalar: string[]
  uyarilar: string[]
  gecerli: boolean
  data: Record<string, unknown>
}> {
  const hatalar: string[] = []
  const uyarilar: string[] = []
  const data: Record<string, unknown> = { satir: rowIndex }
  
  // Evrak tipi
  if (!row.evrak_tipi) {
    hatalar.push('Evrak tipi zorunludur')
  } else {
    const tip = String(row.evrak_tipi).toLowerCase().trim()
    if (!GECERLI_EVRAK_TIPLERI.includes(tip)) {
      hatalar.push(`Geçersiz evrak tipi: "${row.evrak_tipi}"`)
    } else {
      data.evrak_tipi = tip
    }
  }
  
  // Evrak no
  if (!row.evrak_no) {
    hatalar.push('Evrak no zorunludur')
  } else {
    const evrakNo = String(row.evrak_no).trim()
    if (evrakNo.length > 50) {
      hatalar.push('Evrak no en fazla 50 karakter olabilir')
    } else {
      data.evrak_no = evrakNo
      if (await isEvrakNoExists(evrakNo)) {
        uyarilar.push(`Evrak no "${evrakNo}" sistemde zaten mevcut`)
      }
    }
  }
  
  // Tutar
  const tutar = parseAmount(row.tutar)
  if (tutar === null) {
    hatalar.push('Tutar zorunludur ve pozitif bir sayı olmalıdır')
  } else {
    data.tutar = tutar
  }
  
  // Vade tarihi
  const vadeTarihi = parseDate(row.vade_tarihi)
  if (!vadeTarihi) {
    hatalar.push('Vade tarihi zorunludur')
  } else {
    data.vade_tarihi = vadeTarihi
  }
  
  // Para birimi
  if (row.para_birimi) {
    const paraBirimi = String(row.para_birimi).toUpperCase().trim()
    if (!GECERLI_PARA_BIRIMLERI.includes(paraBirimi)) {
      hatalar.push(`Geçersiz para birimi: "${row.para_birimi}"`)
    } else {
      data.para_birimi = paraBirimi
    }
  } else {
    data.para_birimi = 'TRY'
  }
  
  // Döviz kuru
  if (data.para_birimi && data.para_birimi !== 'TRY') {
    const dovizKuru = parseAmount(row.doviz_kuru)
    if (dovizKuru === null) {
      hatalar.push(`${data.para_birimi} için döviz kuru zorunludur`)
    } else {
      data.doviz_kuru = dovizKuru
    }
  } else {
    data.doviz_kuru = null
  }
  
  // Evrak tarihi
  if (row.evrak_tarihi) {
    const evrakTarihi = parseDate(row.evrak_tarihi)
    if (!evrakTarihi) {
      uyarilar.push('Evrak tarihi geçersiz format, atlandı')
    } else {
      data.evrak_tarihi = evrakTarihi
    }
  }
  
  // Durum
  if (row.durum) {
    const durum = String(row.durum).toLowerCase().trim()
    if (!GECERLI_DURUMLAR.includes(durum)) {
      uyarilar.push(`Geçersiz durum: "${row.durum}". "portfoy" olarak ayarlandı`)
      data.durum = 'portfoy'
    } else {
      data.durum = durum
    }
  } else {
    data.durum = 'portfoy'
  }
  
  // Banka adı
  if (row.banka_adi) {
    data.banka_adi = String(row.banka_adi).trim().substring(0, 100)
  }
  
  // Keşideci
  if (row.kesideci) {
    data.kesideci = String(row.kesideci).trim().substring(0, 200)
  }
  
  // Cari eşleştirme
  if (row.cari_adi) {
    const cariAdi = String(row.cari_adi).trim()
    data.cari_adi = cariAdi
    const cariId = await findCariByName(cariAdi)
    if (cariId) {
      data.cari_id = cariId
    } else {
      uyarilar.push(`Cari "${cariAdi}" sistemde bulunamadı`)
    }
  }
  
  // Notlar
  if (row.notlar) {
    data.notlar = String(row.notlar).trim().substring(0, 1000)
  }
  
  return {
    hatalar,
    uyarilar,
    gecerli: hatalar.length === 0,
    data
  }
}

/**
 * Excel buffer'ını parse et
 */
export async function parseExcelBuffer(buffer: ArrayBuffer | Buffer): Promise<{
  success: boolean
  data: ParsedRow[]
  ozet: {
    toplam: number
    gecerli: number
    hatali: number
    uyarili: number
  }
}> {
  const workbook = new ExcelJS.Workbook()
  
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await workbook.xlsx.load(buffer as any)
  } catch {
    throw new Error('Excel dosyası okunamadı')
  }
  
  const worksheet = workbook.getWorksheet(1)
  
  if (!worksheet) {
    throw new Error('Excel dosyasında sayfa bulunamadı')
  }
  
  const rows: ParsedRow[] = []
  const headerMapping: Record<number, string> = {}
  
  // Satırları işle
  let rowIndex = 0
  for (const row of worksheet.getRows(1, worksheet.rowCount) || []) {
    rowIndex++
    
    // İlk satır header
    if (rowIndex === 1) {
      row.eachCell((cell, colNumber) => {
        const headerValue = cleanCellValue(cell.value).toLowerCase()
        const mappedField = KOLON_MAPPING[headerValue]
        if (mappedField) {
          headerMapping[colNumber] = mappedField
        }
      })
      
      // Zorunlu kolonları kontrol et
      const zorunluKolonlar = ['evrak_tipi', 'evrak_no', 'tutar', 'vade_tarihi']
      const mevcutKolonlar = Object.values(headerMapping)
      const eksikKolonlar = zorunluKolonlar.filter(k => !mevcutKolonlar.includes(k))
      
      if (eksikKolonlar.length > 0) {
        throw new Error(`Eksik zorunlu kolonlar: ${eksikKolonlar.join(', ')}`)
      }
      
      continue
    }
    
    // Boş satırları atla
    let isEmpty = true
    row.eachCell((cell) => {
      if (cleanCellValue(cell.value)) {
        isEmpty = false
      }
    })
    
    if (isEmpty) continue
    
    // Satır verisini oluştur
    const rowData: Record<string, unknown> = {}
    
    row.eachCell((cell, colNumber) => {
      const field = headerMapping[colNumber]
      if (field) {
        if (field === 'evrak_tarihi' || field === 'vade_tarihi') {
          rowData[field] = cell.value
        } else {
          rowData[field] = cleanCellValue(cell.value)
        }
      }
    })
    
    // Validate et
    const validation = await validateRow(rowData, rowIndex)
    
    rows.push({
      satir: rowIndex,
      ...validation.data,
      hatalar: validation.hatalar,
      uyarilar: validation.uyarilar,
      gecerli: validation.gecerli
    } as ParsedRow)
  }
  
  if (rows.length === 0) {
    throw new Error('Excel dosyasında veri bulunamadı')
  }
  
  return {
    success: true,
    data: rows,
    ozet: {
      toplam: rows.length,
      gecerli: rows.filter(r => r.gecerli).length,
      hatali: rows.filter(r => !r.gecerli).length,
      uyarili: rows.filter(r => r.uyarilar.length > 0).length
    }
  }
}

/**
 * Import template oluştur
 */
export async function createImportTemplate(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'ÇekSenet Takip Sistemi'
  workbook.created = new Date()
  
  const worksheet = workbook.addWorksheet('Evrak Verileri', {
    properties: { tabColor: { argb: '3B82F6' } }
  })
  
  // Kolonlar
  worksheet.columns = [
    { header: 'Evrak Tipi *', key: 'evrak_tipi', width: 12 },
    { header: 'Evrak No *', key: 'evrak_no', width: 15 },
    { header: 'Tutar *', key: 'tutar', width: 15 },
    { header: 'Para Birimi', key: 'para_birimi', width: 12 },
    { header: 'Döviz Kuru', key: 'doviz_kuru', width: 12 },
    { header: 'Vade Tarihi *', key: 'vade_tarihi', width: 15 },
    { header: 'Evrak Tarihi', key: 'evrak_tarihi', width: 15 },
    { header: 'Banka Adı', key: 'banka_adi', width: 20 },
    { header: 'Keşideci', key: 'kesideci', width: 20 },
    { header: 'Cari Adı', key: 'cari_adi', width: 20 },
    { header: 'Durum', key: 'durum', width: 12 },
    { header: 'Notlar', key: 'notlar', width: 30 },
  ]
  
  // Header stili
  const headerRow = worksheet.getRow(1)
  headerRow.font = { bold: true, color: { argb: 'FFFFFF' } }
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: '3B82F6' }
  }
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' }
  
  // Örnek satır
  worksheet.addRow({
    evrak_tipi: 'cek',
    evrak_no: 'CHK-001',
    tutar: 10000,
    para_birimi: 'TRY',
    doviz_kuru: '',
    vade_tarihi: '15.02.2026',
    evrak_tarihi: '01.01.2026',
    banka_adi: 'Garanti Bankası',
    kesideci: 'Örnek Şirket A.Ş.',
    cari_adi: '',
    durum: 'portfoy',
    notlar: 'Örnek not'
  })
  
  // Açıklama sayfası
  const infoSheet = workbook.addWorksheet('Açıklamalar')
  infoSheet.columns = [
    { header: 'Alan', width: 20 },
    { header: 'Açıklama', width: 50 },
    { header: 'Geçerli Değerler', width: 40 }
  ]
  
  const infoHeaderRow = infoSheet.getRow(1)
  infoHeaderRow.font = { bold: true }
  
  const bilgiler = [
    ['Evrak Tipi *', 'Zorunlu alan', 'cek, senet'],
    ['Evrak No *', 'Zorunlu, benzersiz olmalı', ''],
    ['Tutar *', 'Zorunlu, pozitif sayı', ''],
    ['Para Birimi', 'Varsayılan: TRY', 'TRY, USD, EUR, GBP, CHF'],
    ['Döviz Kuru', 'TRY dışında zorunlu', ''],
    ['Vade Tarihi *', 'Zorunlu', 'GG.AA.YYYY veya YYYY-MM-DD'],
    ['Evrak Tarihi', 'Opsiyonel', 'GG.AA.YYYY veya YYYY-MM-DD'],
    ['Banka Adı', 'Çekin bankası', ''],
    ['Keşideci', 'Evrakı düzenleyen', ''],
    ['Cari Adı', 'Sistemdeki cari ile eşleştirilir', ''],
    ['Durum', 'Varsayılan: portfoy', 'portfoy, bankada, ciro, tahsil, karsiliksiz'],
    ['Notlar', 'Opsiyonel', '']
  ]
  
  bilgiler.forEach(row => infoSheet.addRow(row))
  
  return Buffer.from(await workbook.xlsx.writeBuffer()) as unknown as Buffer
}
