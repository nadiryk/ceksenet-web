import { NextResponse } from 'next/server'

/**
 * Başarılı response döner
 */
export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status })
}

/**
 * Liste response döner (pagination ile)
 */
export function listResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
) {
  return NextResponse.json({
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  })
}

/**
 * Hata response döner
 */
export function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

/**
 * 404 Not Found response döner
 */
export function notFoundResponse(message = 'Kayıt bulunamadı') {
  return NextResponse.json({ error: message }, { status: 404 })
}

/**
 * 401 Unauthorized response döner
 */
export function unauthorizedResponse(message = 'Oturum açmanız gerekiyor') {
  return NextResponse.json({ error: message }, { status: 401 })
}

/**
 * 403 Forbidden response döner
 */
export function forbiddenResponse(message = 'Bu işlem için yetkiniz yok') {
  return NextResponse.json({ error: message }, { status: 403 })
}

/**
 * 500 Internal Server Error response döner
 */
export function serverErrorResponse(message = 'Sunucu hatası oluştu') {
  return NextResponse.json({ error: message }, { status: 500 })
}

/**
 * Query params'tan pagination değerlerini parse eder
 */
export function parsePagination(searchParams: URLSearchParams) {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))
  const offset = (page - 1) * limit
  
  return { page, limit, offset }
}
