import { NextRequest } from 'next/server'
import { requireAuth, isAuthError } from '@/lib/api/auth'
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  serverErrorResponse,
} from '@/lib/api/response'
import { getKurlar, SUPPORTED_CURRENCIES } from '@/lib/tcmb'

interface RouteParams {
  params: Promise<{ paraBirimi: string }>
}

/**
 * GET /api/kurlar/[paraBirimi]
 * Tek bir para birimi için kur getir
 * 
 * Path params:
 * - paraBirimi: 'USD' | 'EUR' | 'GBP' | 'CHF' | 'TRY'
 * 
 * Response:
 * {
 *   data: {
 *     paraBirimi: string,
 *     kur: number | null,
 *     tarih: string | null
 *   }
 * }
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth()
    
    const { paraBirimi } = await params
    const upperParaBirimi = paraBirimi.toUpperCase()
    
    // TRY kontrolü
    if (upperParaBirimi === 'TRY') {
      return successResponse({
        paraBirimi: 'TRY',
        kur: 1,
        tarih: new Date().toISOString().split('T')[0]
      })
    }
    
    // Desteklenen para birimi kontrolü
    if (!SUPPORTED_CURRENCIES.includes(upperParaBirimi as typeof SUPPORTED_CURRENCIES[number])) {
      return errorResponse(
        `Desteklenmeyen para birimi: ${paraBirimi}. Desteklenen: TRY, ${SUPPORTED_CURRENCIES.join(', ')}`
      )
    }
    
    const result = await getKurlar()
    const kur = result.kurlar[upperParaBirimi as keyof typeof result.kurlar]
    
    return successResponse({
      paraBirimi: upperParaBirimi,
      kur: kur ?? null,
      tarih: result.kurlar.tarih,
      cached: result.cached,
      stale: result.stale || false
    })
    
  } catch (error) {
    if (isAuthError(error)) {
      return error.status === 401 
        ? unauthorizedResponse(error.message)
        : forbiddenResponse(error.message)
    }
    console.error('Kur GET hatası:', error)
    return serverErrorResponse()
  }
}
