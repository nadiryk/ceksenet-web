import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth, isAuthError } from '@/lib/api/auth'
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  unauthorizedResponse,
  forbiddenResponse,
  serverErrorResponse,
} from '@/lib/api/response'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/evraklar/[id]/gecmis
 * Evrak hareket geçmişi (tüm durum değişiklikleri)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth()
    
    const { id } = await params
    const evrakId = parseInt(id, 10)
    
    if (isNaN(evrakId)) {
      return errorResponse('Geçersiz evrak ID')
    }
    
    const supabase = await createClient()
    
    // Evrak var mı kontrol et
    const { data: evrak, error: evrakError } = await supabase
      .from('evraklar')
      .select('id, evrak_no')
      .eq('id', evrakId)
      .single()
    
    if (evrakError || !evrak) {
      return notFoundResponse('Evrak bulunamadı')
    }
    
    // Tüm hareketleri getir
    const { data: hareketler, error: hareketError } = await supabase
      .from('evrak_hareketleri')
      .select('*')
      .eq('evrak_id', evrakId)
      .order('created_at', { ascending: false })
    
    if (hareketError) {
      console.error('Hareket geçmişi hatası:', hareketError)
      return serverErrorResponse('Hareket geçmişi yüklenirken hata oluştu')
    }
    
    // Hareket yapan kullanıcı bilgilerini ekle
    let hareketlerWithUser = hareketler || []
    
    if (hareketler && hareketler.length > 0) {
      const userIds = [...new Set(hareketler.map(h => h.created_by).filter(Boolean))]
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, ad_soyad')
          .in('id', userIds)
        
        const profileMap = new Map(profiles?.map(p => [p.id, p.ad_soyad]) || [])
        
        hareketlerWithUser = hareketler.map(h => ({
          ...h,
          created_by_name: h.created_by ? profileMap.get(h.created_by) || null : null
        }))
      }
    }
    
    return successResponse({
      evrak_id: evrakId,
      evrak_no: evrak.evrak_no,
      toplam: hareketlerWithUser.length,
      hareketler: hareketlerWithUser
    })
    
  } catch (error) {
    if (isAuthError(error)) {
      return error.status === 401 
        ? unauthorizedResponse(error.message)
        : forbiddenResponse(error.message)
    }
    console.error('Evrak geçmiş GET hatası:', error)
    return serverErrorResponse()
  }
}
