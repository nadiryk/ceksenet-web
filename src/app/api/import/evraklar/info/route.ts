import { requireAuth, isAuthError } from '@/lib/api/auth'
import {
  successResponse,
  unauthorizedResponse,
  forbiddenResponse,
  serverErrorResponse,
} from '@/lib/api/response'

/**
 * GET /api/import/evraklar/info
 * Import hakkında bilgi döndür
 */
export async function GET() {
  try {
    await requireAuth()
    
    return successResponse({
      maxFileSize: '5MB',
      allowedFormats: ['.xlsx', '.xls'],
      maxRows: 1000,
      requiredColumns: [
        { name: 'Evrak Tipi *', field: 'evrak_tipi', description: 'cek veya senet' },
        { name: 'Evrak No *', field: 'evrak_no', description: 'Benzersiz evrak numarası' },
        { name: 'Tutar *', field: 'tutar', description: 'Pozitif sayısal değer' },
        { name: 'Vade Tarihi *', field: 'vade_tarihi', description: 'GG.AA.YYYY veya YYYY-MM-DD' }
      ],
      optionalColumns: [
        { name: 'Para Birimi', field: 'para_birimi', description: 'TRY, USD, EUR, GBP, CHF (varsayılan: TRY)' },
        { name: 'Döviz Kuru', field: 'doviz_kuru', description: 'TRY dışı para birimlerinde zorunlu' },
        { name: 'Evrak Tarihi', field: 'evrak_tarihi', description: 'GG.AA.YYYY veya YYYY-MM-DD' },
        { name: 'Banka Adı', field: 'banka_adi', description: 'Çekin bankası' },
        { name: 'Keşideci', field: 'kesideci', description: 'Evrakı düzenleyen' },
        { name: 'Cari Adı', field: 'cari_adi', description: 'Sistemde varsa eşleştirilir' },
        { name: 'Durum', field: 'durum', description: 'portfoy, bankada, ciro, tahsil, karsiliksiz' },
        { name: 'Notlar', field: 'notlar', description: 'Ek açıklamalar' }
      ],
      supportedDateFormats: [
        'GG.AA.YYYY (01.01.2025)',
        'GG/AA/YYYY (01/01/2025)',
        'YYYY-MM-DD (2025-01-01)',
        'Excel tarih formatı'
      ]
    })
    
  } catch (error) {
    if (isAuthError(error)) {
      return error.status === 401 
        ? unauthorizedResponse(error.message)
        : forbiddenResponse(error.message)
    }
    console.error('Import info hatası:', error)
    return serverErrorResponse()
  }
}
