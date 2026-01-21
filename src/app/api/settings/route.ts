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
 * GET /api/settings
 * Tüm ayarları getir
 * 
 * Response:
 * {
 *   data: {
 *     whatsapp_telefon: string | null,
 *     whatsapp_mesaj: string | null,
 *     ...
 *   }
 * }
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth()
    
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('ayarlar')
      .select('key, value')
    
    if (error) {
      console.error('Ayarlar listesi hatası:', error)
      return serverErrorResponse('Ayarlar yüklenirken hata oluştu')
    }
    
    // Key-value array'ini object'e çevir
    const settings: Record<string, string | null> = {}
    data?.forEach((row) => {
      settings[row.key] = row.value
    })
    
    return successResponse(settings)
    
  } catch (error) {
    if (isAuthError(error)) {
      return error.status === 401 
        ? unauthorizedResponse(error.message)
        : forbiddenResponse(error.message)
    }
    console.error('Settings GET hatası:', error)
    return serverErrorResponse()
  }
}

/**
 * PUT /api/settings
 * Ayarları güncelle
 * 
 * Body:
 * {
 *   whatsapp_telefon?: string,
 *   whatsapp_mesaj?: string,
 *   ...
 * }
 * 
 * Not: Sadece gönderilen key'ler güncellenir (upsert)
 */
export async function PUT(request: NextRequest) {
  try {
    await requireAuth()
    
    const supabase = await createClient()
    const body = await request.json()
    
    // Boş body kontrolü
    if (!body || Object.keys(body).length === 0) {
      return errorResponse('Güncellenecek ayar bulunamadı')
    }
    
    // İzin verilen ayar key'leri (güvenlik için whitelist)
    const allowedKeys = [
      'whatsapp_telefon',
      'whatsapp_mesaj',
      'firma_adi',
      'firma_telefon',
      'firma_adres',
    ]
    
    // Sadece izin verilen key'leri filtrele
    const updates: { key: string; value: string | null }[] = []
    
    for (const [key, value] of Object.entries(body)) {
      if (allowedKeys.includes(key)) {
        updates.push({
          key,
          value: value !== null && value !== undefined ? String(value).trim() || null : null,
        })
      }
    }
    
    if (updates.length === 0) {
      return errorResponse('Geçerli ayar key\'i bulunamadı')
    }
    
    // Upsert işlemi (varsa güncelle, yoksa ekle)
    const { error } = await supabase
      .from('ayarlar')
      .upsert(updates, { onConflict: 'key' })
    
    if (error) {
      console.error('Ayarlar güncelleme hatası:', error)
      return serverErrorResponse('Ayarlar güncellenirken hata oluştu')
    }
    
    // Güncel ayarları döndür
    const { data: updatedSettings } = await supabase
      .from('ayarlar')
      .select('key, value')
    
    const settings: Record<string, string | null> = {}
    updatedSettings?.forEach((row) => {
      settings[row.key] = row.value
    })
    
    return successResponse(settings)
    
  } catch (error) {
    if (isAuthError(error)) {
      return error.status === 401 
        ? unauthorizedResponse(error.message)
        : forbiddenResponse(error.message)
    }
    console.error('Settings PUT hatası:', error)
    return serverErrorResponse()
  }
}
