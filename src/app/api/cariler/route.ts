import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth, isAuthError } from '@/lib/api/auth'
import {
  successResponse,
  listResponse,
  errorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  serverErrorResponse,
  parsePagination,
} from '@/lib/api/response'

/**
 * GET /api/cariler
 * Cari listesi (filtreleme ve sayfalama ile)
 * 
 * Query params:
 * - tip: 'musteri' | 'tedarikci' (opsiyonel)
 * - search: arama terimi (opsiyonel)
 * - page: sayfa numarası (default: 1)
 * - limit: sayfa başı kayıt (default: 20, max: 100)
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth()
    
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    // Pagination
    const { page, limit, offset } = parsePagination(searchParams)
    
    // Filters
    const tip = searchParams.get('tip')
    const search = searchParams.get('search')
    
    // Query builder
    let query = supabase
      .from('cariler')
      .select('*', { count: 'exact' })
    
    // Tip filtresi
    if (tip && (tip === 'musteri' || tip === 'tedarikci')) {
      query = query.eq('tip', tip)
    }
    
    // Arama filtresi
    if (search) {
      query = query.or(`ad_soyad.ilike.%${search}%,telefon.ilike.%${search}%,email.ilike.%${search}%,vergi_no.ilike.%${search}%`)
    }
    
    // Sıralama ve pagination
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    
    const { data, error, count } = await query
    
    if (error) {
      console.error('Cariler listesi hatası:', error)
      return serverErrorResponse('Cariler yüklenirken hata oluştu')
    }
    
    return listResponse(data || [], count || 0, page, limit)
    
  } catch (error) {
    if (isAuthError(error)) {
      return error.status === 401 
        ? unauthorizedResponse(error.message)
        : forbiddenResponse(error.message)
    }
    console.error('Cariler GET hatası:', error)
    return serverErrorResponse()
  }
}

/**
 * POST /api/cariler
 * Yeni cari ekle
 * 
 * Body:
 * - ad_soyad: string (zorunlu)
 * - tip: 'musteri' | 'tedarikci' (zorunlu)
 * - telefon?: string
 * - email?: string
 * - adres?: string
 * - vergi_no?: string
 * - notlar?: string
 */
export async function POST(request: NextRequest) {
  try {
    await requireAuth()
    
    const supabase = await createClient()
    const body = await request.json()
    
    // Validasyon
    if (!body.ad_soyad || !body.ad_soyad.trim()) {
      return errorResponse('Ad Soyad zorunludur')
    }
    
    if (!body.tip || !['musteri', 'tedarikci'].includes(body.tip)) {
      return errorResponse('Geçerli bir tip seçiniz (musteri/tedarikci)')
    }
    
    // Insert
    const { data, error } = await supabase
      .from('cariler')
      .insert({
        ad_soyad: body.ad_soyad.trim(),
        tip: body.tip,
        telefon: body.telefon?.trim() || null,
        email: body.email?.trim() || null,
        adres: body.adres?.trim() || null,
        vergi_no: body.vergi_no?.trim() || null,
        notlar: body.notlar?.trim() || null,
      })
      .select()
      .single()
    
    if (error) {
      console.error('Cari ekleme hatası:', error)
      return serverErrorResponse('Cari eklenirken hata oluştu')
    }
    
    return successResponse(data, 201)
    
  } catch (error) {
    if (isAuthError(error)) {
      return error.status === 401 
        ? unauthorizedResponse(error.message)
        : forbiddenResponse(error.message)
    }
    console.error('Cariler POST hatası:', error)
    return serverErrorResponse()
  }
}
