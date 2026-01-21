import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth, isAuthError } from '@/lib/api/auth'
import {
  errorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  serverErrorResponse,
} from '@/lib/api/response'
import ExcelJS from 'exceljs'

// Durum Türkçe karşılıkları
const DURUM_ISIMLERI: Record<string, string> = {
  'portfoy': 'Portföy',
  'bankada': 'Bankada',
  'ciro': 'Ciro Edildi',
  'tahsil': 'Tahsil Edildi',
  'karsiliksiz': 'Karşılıksız',
}

// Evrak tipi Türkçe karşılıkları
const EVRAK_TIPI_ISIMLERI: Record<string, string> = {
  'cek': 'Çek',
  'senet': 'Senet',
}

// Cari tipi Türkçe karşılıkları
const CARI_TIPI_ISIMLERI: Record<string, string> = {
  'musteri': 'Müşteri',
  'tedarikci': 'Tedarikçi',
}

/**
 * GET /api/raporlar/excel
 * Evrakları Excel dosyası olarak export et
 * 
 * Query params (evraklar listesiyle aynı):
 * - evrak_tipi: 'cek' | 'senet'
 * - durum: 'portfoy' | 'bankada' | 'ciro' | 'tahsil' | 'karsiliksiz'
 * - cari_id: number
 * - para_birimi: 'TRY' | 'USD' | 'EUR' | 'GBP' | 'CHF'
 * - vade_baslangic: date (YYYY-MM-DD)
 * - vade_bitis: date (YYYY-MM-DD)
 * - search: string
 * 
 * Response: Excel dosyası (.xlsx)
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth()
    
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    // Filters
    const evrak_tipi = searchParams.get('evrak_tipi')
    const durum = searchParams.get('durum')
    const cari_id = searchParams.get('cari_id')
    const para_birimi = searchParams.get('para_birimi')
    const vade_baslangic = searchParams.get('vade_baslangic')
    const vade_bitis = searchParams.get('vade_bitis')
    const search = searchParams.get('search')
    
    // Query builder - cari ve banka bilgisi ile birlikte
    let query = supabase
      .from('evraklar')
      .select(`
        *,
        cari:cariler(ad_soyad, tip),
        banka:bankalar(ad)
      `)
    
    // Filtreleri uygula
    if (evrak_tipi && ['cek', 'senet'].includes(evrak_tipi)) {
      query = query.eq('evrak_tipi', evrak_tipi)
    }
    
    if (durum && ['portfoy', 'bankada', 'ciro', 'tahsil', 'karsiliksiz'].includes(durum)) {
      query = query.eq('durum', durum)
    }
    
    if (cari_id) {
      query = query.eq('cari_id', parseInt(cari_id, 10))
    }
    
    if (para_birimi && ['TRY', 'USD', 'EUR', 'GBP', 'CHF'].includes(para_birimi)) {
      query = query.eq('para_birimi', para_birimi)
    }
    
    if (vade_baslangic) {
      query = query.gte('vade_tarihi', vade_baslangic)
    }
    
    if (vade_bitis) {
      query = query.lte('vade_tarihi', vade_bitis)
    }
    
    if (search) {
      query = query.or(`evrak_no.ilike.%${search}%,kesideci.ilike.%${search}%`)
    }
    
    // Sıralama
    query = query.order('vade_tarihi', { ascending: true })
    
    const { data: evraklar, error } = await query
    
    if (error) {
      console.error('Excel export veri hatası:', error)
      return serverErrorResponse('Veriler yüklenirken hata oluştu')
    }
    
    if (!evraklar || evraklar.length === 0) {
      return errorResponse('Seçilen kriterlere uygun evrak bulunamadı', 404)
    }
    
    // Excel workbook oluştur
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'ÇekSenet Takip Sistemi'
    workbook.created = new Date()
    
    const worksheet = workbook.addWorksheet('Evraklar', {
      properties: { tabColor: { argb: '3B82F6' } }
    })
    
    // Sütunlar
    worksheet.columns = [
      { header: 'Evrak No', key: 'evrak_no', width: 15 },
      { header: 'Evrak Tipi', key: 'evrak_tipi', width: 12 },
      { header: 'Tutar', key: 'tutar', width: 15 },
      { header: 'Para Birimi', key: 'para_birimi', width: 12 },
      { header: 'Döviz Kuru', key: 'doviz_kuru', width: 12 },
      { header: 'TRY Karşılığı', key: 'try_karsiligi', width: 15 },
      { header: 'Vade Tarihi', key: 'vade_tarihi', width: 12 },
      { header: 'Durum', key: 'durum', width: 15 },
      { header: 'Cari', key: 'cari', width: 25 },
      { header: 'Cari Tipi', key: 'cari_tipi', width: 12 },
      { header: 'Keşideci', key: 'kesideci', width: 20 },
      { header: 'Banka', key: 'banka', width: 20 },
      { header: 'Evrak Tarihi', key: 'evrak_tarihi', width: 12 },
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
    
    // Veri satırları
    for (const evrak of evraklar) {
      const tryKarsiligi = evrak.para_birimi === 'TRY' 
        ? evrak.tutar 
        : (evrak.doviz_kuru ? evrak.tutar * evrak.doviz_kuru : null)
      
      worksheet.addRow({
        evrak_no: evrak.evrak_no,
        evrak_tipi: EVRAK_TIPI_ISIMLERI[evrak.evrak_tipi] || evrak.evrak_tipi,
        tutar: evrak.tutar,
        para_birimi: evrak.para_birimi,
        doviz_kuru: evrak.doviz_kuru || '-',
        try_karsiligi: tryKarsiligi,
        vade_tarihi: evrak.vade_tarihi,
        durum: DURUM_ISIMLERI[evrak.durum] || evrak.durum,
        cari: evrak.cari?.ad_soyad || '-',
        cari_tipi: evrak.cari?.tip ? CARI_TIPI_ISIMLERI[evrak.cari.tip] : '-',
        kesideci: evrak.kesideci || '-',
        banka: evrak.banka?.ad || evrak.banka_adi || '-',
        evrak_tarihi: evrak.evrak_tarihi || '-',
        notlar: evrak.notlar || '-',
      })
    }
    
    // Tutar ve TRY karşılığı sütunlarına sayı formatı
    worksheet.getColumn('tutar').numFmt = '#,##0.00'
    worksheet.getColumn('try_karsiligi').numFmt = '#,##0.00 ₺'
    worksheet.getColumn('doviz_kuru').numFmt = '#,##0.0000'
    
    // Tablo kenarlıkları
    worksheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        }
      })
    })
    
    // Özet satırı
    const sonSatir = worksheet.rowCount + 2
    worksheet.getCell(`A${sonSatir}`).value = 'TOPLAM:'
    worksheet.getCell(`A${sonSatir}`).font = { bold: true }
    worksheet.getCell(`B${sonSatir}`).value = `${evraklar.length} Evrak`
    worksheet.getCell(`F${sonSatir}`).value = { formula: `SUM(F2:F${worksheet.rowCount - 1})` }
    worksheet.getCell(`F${sonSatir}`).font = { bold: true }
    worksheet.getCell(`F${sonSatir}`).numFmt = '#,##0.00 ₺'
    
    // Dosya adı
    const tarih = new Date().toISOString().split('T')[0]
    let dosyaAdi = `evraklar_${tarih}`
    if (vade_baslangic && vade_bitis) {
      dosyaAdi = `evraklar_${vade_baslangic}_${vade_bitis}`
    }
    dosyaAdi += '.xlsx'
    
    // Excel dosyasını buffer'a yaz
    const buffer = await workbook.xlsx.writeBuffer()
    
    // Response
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${dosyaAdi}"`,
      },
    })
    
  } catch (error) {
    if (isAuthError(error)) {
      return error.status === 401 
        ? unauthorizedResponse(error.message)
        : forbiddenResponse(error.message)
    }
    console.error('Excel export hatası:', error)
    return serverErrorResponse('Excel dosyası oluşturulamadı')
  }
}
