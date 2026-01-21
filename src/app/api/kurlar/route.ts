import { NextRequest } from 'next/server'
import { requireAuth, isAuthError } from '@/lib/api/auth'
import {
  successResponse,
  unauthorizedResponse,
  forbiddenResponse,
  serverErrorResponse,
} from '@/lib/api/response'
import { getKurlar } from '@/lib/tcmb'

/**
 * GET /api/kurlar
 * Tüm döviz kurlarını getir (TCMB)
 * 
 * Query params:
 * - refresh: 'true' ise cache'i yoksay ve TCMB'den çek
 * 
 * Response:
 * {
 *   data: {
 *     TRY: 1,
 *     USD: number | null,
 *     EUR: number | null,
 *     GBP: number | null,
 *     CHF: number | null,
 *     tarih: string | null
 *   },
 *   cached: boolean,
 *   stale?: boolean,
 *   updated_at: string | null,
 *   error?: string
 * }
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth()
    
    const { searchParams } = new URL(request.url)
    const forceRefresh = searchParams.get('refresh') === 'true'
    
    const result = await getKurlar(forceRefresh)
    
    return successResponse({
      kurlar: result.kurlar,
      cached: result.cached,
      stale: result.stale || false,
      updated_at: result.updated_at,
      error: result.error || null,
      unavailable: result.unavailable || false
    })
    
  } catch (error) {
    if (isAuthError(error)) {
      return error.status === 401 
        ? unauthorizedResponse(error.message)
        : forbiddenResponse(error.message)
    }
    console.error('Kurlar GET hatası:', error)
    return serverErrorResponse()
  }
}
