import { NextRequest } from 'next/server'
import { requireAuth, isAuthError } from '@/lib/api/auth'
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  serverErrorResponse,
} from '@/lib/api/response'
import { parseExcelBuffer } from '@/lib/excelParser'

// Max dosya boyutu: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024

/**
 * POST /api/import/evraklar/parse
 * Excel dosyasını yükle ve parse et
 * 
 * Request: multipart/form-data
 * - file: Excel dosyası (.xlsx)
 */
export async function POST(request: NextRequest) {
  try {
    await requireAuth()
    
    // FormData'dan dosyayı al
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    
    if (!file) {
      return errorResponse('Dosya yüklenmedi. Lütfen bir Excel dosyası seçin.')
    }
    
    // Dosya tipi kontrolü
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
    ]
    
    if (!allowedTypes.includes(file.type) && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      return errorResponse('Geçersiz dosya formatı. Sadece .xlsx ve .xls dosyaları kabul edilir.')
    }
    
    // Dosya boyutu kontrolü
    if (file.size > MAX_FILE_SIZE) {
      return errorResponse(`Dosya boyutu çok büyük. Maksimum ${MAX_FILE_SIZE / 1024 / 1024}MB`)
    }
    
    // Dosyayı buffer'a çevir
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    // Parse et
    const result = await parseExcelBuffer(buffer)
    
    return successResponse(result)
    
  } catch (error) {
    if (isAuthError(error)) {
      return error.status === 401 
        ? unauthorizedResponse(error.message)
        : forbiddenResponse(error.message)
    }
    
    // Parse hatası
    if (error instanceof Error) {
      return errorResponse(error.message)
    }
    
    console.error('Import parse hatası:', error)
    return serverErrorResponse('Dosya işlenirken bir hata oluştu')
  }
}
