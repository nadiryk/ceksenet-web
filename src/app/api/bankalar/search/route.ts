import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth, isAuthError } from '@/lib/api/auth'
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  serverErrorResponse,
} from '@/lib/api/response'

/**
 * GET /api/bankalar/search
 * Banka arama (autocomplete için)
 * 
 * Query params:
 * - q: arama terimi (zorunlu, min 2 karakter)
 * - limit: sonuç limiti (default: 10, max: 20)
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth()
    
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    const query = searchParams.get('q')
    const limit = Math.min(20, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)))
    
    // Validasyon
    if (!query || query.trim().length < 2) {
      return errorResponse('Arama terimi en az 2 karakter olmalıdır')
    }
    
    const searchTerm = query.trim()
    
    // Arama (sadece aktif bankalar)
    const { data, error } = await supabase
      .from('bankalar')
      .select('id, ad')
      .eq('aktif', true)
      .ilike('ad', `%${searchTerm}%`)
      .order('ad', { ascending: true })
      .limit(limit)
    
    if (error) {
      console.error('Banka arama hatası:', error)
      return serverErrorResponse('Banka araması sırasında hata oluştu')
    }
    
    return successResponse(data || [])
    
  } catch (error) {
    if (isAuthError(error)) {
      return error.status === 401 
        ? unauthorizedResponse(error.message)
        : forbiddenResponse(error.message)
    }
    console.error('Bankalar search hatası:', error)
    return serverErrorResponse()
  }
}
