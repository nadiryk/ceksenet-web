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
 * GET /api/bankalar
 * Banka listesi
 * 
 * Query params:
 * - aktif: 'true' | 'false' (opsiyonel, default: sadece aktifler)
 * - all: 'true' ise tümünü getirir
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth()
    
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    const showAll = searchParams.get('all') === 'true'
    const aktifParam = searchParams.get('aktif')
    
    // Query builder
    let query = supabase
      .from('bankalar')
      .select('*')
      .order('ad', { ascending: true })
    
    // Aktiflik filtresi
    if (!showAll) {
      if (aktifParam === 'false') {
        query = query.eq('aktif', false)
      } else {
        // Default: sadece aktifler
        query = query.eq('aktif', true)
      }
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('Bankalar listesi hatası:', error)
      return serverErrorResponse('Bankalar yüklenirken hata oluştu')
    }
    
    return successResponse(data || [])
    
  } catch (error) {
    if (isAuthError(error)) {
      return error.status === 401 
        ? unauthorizedResponse(error.message)
        : forbiddenResponse(error.message)
    }
    console.error('Bankalar GET hatası:', error)
    return serverErrorResponse()
  }
}

/**
 * POST /api/bankalar
 * Yeni banka ekle
 * 
 * Body:
 * - ad: string (zorunlu)
 * - aktif?: boolean (default: true)
 */
export async function POST(request: NextRequest) {
  try {
    await requireAuth()
    
    const supabase = await createClient()
    const body = await request.json()
    
    // Validasyon
    if (!body.ad || !body.ad.trim()) {
      return errorResponse('Banka adı zorunludur')
    }
    
    const bankaAdi = body.ad.trim()
    
    // Aynı isimde banka var mı kontrol
    const { data: existing } = await supabase
      .from('bankalar')
      .select('id')
      .ilike('ad', bankaAdi)
      .single()
    
    if (existing) {
      return errorResponse('Bu isimde bir banka zaten mevcut')
    }
    
    // Insert
    const { data, error } = await supabase
      .from('bankalar')
      .insert({
        ad: bankaAdi,
        aktif: body.aktif !== false, // default true
      })
      .select()
      .single()
    
    if (error) {
      console.error('Banka ekleme hatası:', error)
      return serverErrorResponse('Banka eklenirken hata oluştu')
    }
    
    return successResponse(data, 201)
    
  } catch (error) {
    if (isAuthError(error)) {
      return error.status === 401 
        ? unauthorizedResponse(error.message)
        : forbiddenResponse(error.message)
    }
    console.error('Bankalar POST hatası:', error)
    return serverErrorResponse()
  }
}
