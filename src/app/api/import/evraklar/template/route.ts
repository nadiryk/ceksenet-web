import { NextResponse } from 'next/server'
import { requireAuth, isAuthError } from '@/lib/api/auth'
import {
  unauthorizedResponse,
  forbiddenResponse,
  serverErrorResponse,
} from '@/lib/api/response'
import { createImportTemplate } from '@/lib/excelParser'

/**
 * GET /api/import/evraklar/template
 * Import template dosyasını indir
 */
export async function GET() {
  try {
    await requireAuth()
    
    const buffer = await createImportTemplate()
    
    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="evrak-import-template.xlsx"',
      },
    })
    
  } catch (error) {
    if (isAuthError(error)) {
      return error.status === 401 
        ? unauthorizedResponse(error.message)
        : forbiddenResponse(error.message)
    }
    console.error('Template indirme hatası:', error)
    return serverErrorResponse('Template oluşturulamadı')
  }
}
