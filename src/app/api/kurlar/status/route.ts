import { requireAuth, isAuthError } from '@/lib/api/auth'
import {
  successResponse,
  unauthorizedResponse,
  forbiddenResponse,
  serverErrorResponse,
} from '@/lib/api/response'
import { getCacheStatus } from '@/lib/tcmb'

/**
 * GET /api/kurlar/status
 * Döviz kuru cache durumunu getir
 * 
 * Response:
 * {
 *   data: {
 *     hasData: boolean,
 *     lastUpdate: string | null,
 *     lastTarih: string | null
 *   }
 * }
 */
export async function GET() {
  try {
    await requireAuth()
    
    const status = await getCacheStatus()
    
    return successResponse(status)
    
  } catch (error) {
    if (isAuthError(error)) {
      return error.status === 401 
        ? unauthorizedResponse(error.message)
        : forbiddenResponse(error.message)
    }
    console.error('Kur status GET hatası:', error)
    return serverErrorResponse()
  }
}
