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
import { getKur } from '@/lib/tcmb'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/evraklar/[id]
 * Evrak detayı (cari, banka, fotoğraflar, son hareketler ile)
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
    
    // Evrak bilgisi (cari ve banka ile)
    const { data: evrak, error: evrakError } = await supabase
      .from('evraklar')
      .select(`
        *,
        cari:cariler(id, ad_soyad, tip, telefon, email),
        banka:bankalar(id, ad)
      `)
      .eq('id', evrakId)
      .single()
    
    if (evrakError || !evrak) {
      return notFoundResponse('Evrak bulunamadı')
    }
    
    // Fotoğraflar
    const { data: fotograflar } = await supabase
      .from('evrak_fotograflari')
      .select('*')
      .eq('evrak_id', evrakId)
      .order('created_at', { ascending: false })
    
    // Son 10 hareket
    const { data: hareketler } = await supabase
      .from('evrak_hareketleri')
      .select(`
        id,
        eski_durum,
        yeni_durum,
        aciklama,
        created_at,
        created_by
      `)
      .eq('evrak_id', evrakId)
      .order('created_at', { ascending: false })
      .limit(10)
    
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
      ...evrak,
      fotograflar: fotograflar || [],
      hareketler: hareketlerWithUser
    })
    
  } catch (error) {
    if (isAuthError(error)) {
      return error.status === 401 
        ? unauthorizedResponse(error.message)
        : forbiddenResponse(error.message)
    }
    console.error('Evrak GET hatası:', error)
    return serverErrorResponse()
  }
}

/**
 * PUT /api/evraklar/[id]
 * Evrak güncelle
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth()
    
    const { id } = await params
    const evrakId = parseInt(id, 10)
    
    if (isNaN(evrakId)) {
      return errorResponse('Geçersiz evrak ID')
    }
    
    const supabase = await createClient()
    const body = await request.json()
    
    // Mevcut evrakı kontrol et
    const { data: existing, error: existingError } = await supabase
      .from('evraklar')
      .select('id')
      .eq('id', evrakId)
      .single()
    
    if (existingError || !existing) {
      return notFoundResponse('Evrak bulunamadı')
    }
    
    // Güncellenecek alanları hazırla
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    }
    
    // İzin verilen alanları kontrol et ve ekle
    if (body.evrak_tipi && ['cek', 'senet'].includes(body.evrak_tipi)) {
      updateData.evrak_tipi = body.evrak_tipi
    }
    
    if (body.evrak_no !== undefined) {
      if (!body.evrak_no.trim()) {
        return errorResponse('Evrak numarası boş olamaz')
      }
      updateData.evrak_no = body.evrak_no.trim()
    }
    
    if (body.tutar !== undefined) {
      const tutar = parseFloat(body.tutar)
      if (isNaN(tutar) || tutar <= 0) {
        return errorResponse('Geçerli bir tutar giriniz')
      }
      updateData.tutar = tutar
    }
    
    if (body.para_birimi !== undefined) {
      if (!['TRY', 'USD', 'EUR', 'GBP', 'CHF'].includes(body.para_birimi)) {
        return errorResponse('Geçersiz para birimi')
      }
      updateData.para_birimi = body.para_birimi
      
      // Para birimi değiştiyse ve döviz kuru verilmediyse otomatik çek
      if (body.para_birimi !== 'TRY' && !body.doviz_kuru) {
        const kur = await getKur(body.para_birimi)
        updateData.doviz_kuru = kur
      }
    }
    
    if (body.doviz_kuru !== undefined) {
      updateData.doviz_kuru = body.doviz_kuru
    }
    
    if (body.evrak_tarihi !== undefined) {
      updateData.evrak_tarihi = body.evrak_tarihi || null
    }
    
    if (body.vade_tarihi !== undefined) {
      if (!body.vade_tarihi) {
        return errorResponse('Vade tarihi zorunludur')
      }
      updateData.vade_tarihi = body.vade_tarihi
    }
    
    if (body.banka_id !== undefined) {
      updateData.banka_id = body.banka_id || null
    }
    
    if (body.banka_adi !== undefined) {
      updateData.banka_adi = body.banka_adi?.trim() || null
    }
    
    if (body.kesideci !== undefined) {
      updateData.kesideci = body.kesideci?.trim() || null
    }
    
    if (body.cari_id !== undefined) {
      updateData.cari_id = body.cari_id || null
    }
    
    if (body.notlar !== undefined) {
      updateData.notlar = body.notlar?.trim() || null
    }
    
    // NOT: Durum burada güncellenmez, ayrı endpoint var
    
    // Güncelle
    const { data: updated, error: updateError } = await supabase
      .from('evraklar')
      .update(updateData)
      .eq('id', evrakId)
      .select()
      .single()
    
    if (updateError) {
      console.error('Evrak güncelleme hatası:', updateError)
      return serverErrorResponse('Evrak güncellenirken hata oluştu')
    }
    
    return successResponse(updated)
    
  } catch (error) {
    if (isAuthError(error)) {
      return error.status === 401 
        ? unauthorizedResponse(error.message)
        : forbiddenResponse(error.message)
    }
    console.error('Evrak PUT hatası:', error)
    return serverErrorResponse()
  }
}

/**
 * DELETE /api/evraklar/[id]
 * Evrak sil (cascade: hareketler ve fotoğraflar da silinir)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth()
    
    const { id } = await params
    const evrakId = parseInt(id, 10)
    
    if (isNaN(evrakId)) {
      return errorResponse('Geçersiz evrak ID')
    }
    
    const supabase = await createClient()
    
    // Mevcut evrakı kontrol et
    const { data: existing, error: existingError } = await supabase
      .from('evraklar')
      .select('id')
      .eq('id', evrakId)
      .single()
    
    if (existingError || !existing) {
      return notFoundResponse('Evrak bulunamadı')
    }
    
    // Fotoğrafları kontrol et (Storage'dan da silmek için)
    const { data: fotograflar } = await supabase
      .from('evrak_fotograflari')
      .select('storage_path, thumbnail_path')
      .eq('evrak_id', evrakId)
    
    // Storage'dan fotoğrafları sil
    if (fotograflar && fotograflar.length > 0) {
      const pathsToDelete: string[] = []
      
      for (const foto of fotograflar) {
        if (foto.storage_path) pathsToDelete.push(foto.storage_path)
        if (foto.thumbnail_path) pathsToDelete.push(foto.thumbnail_path)
      }
      
      if (pathsToDelete.length > 0) {
        const { error: storageError } = await supabase.storage
          .from('evrak-fotograflari')
          .remove(pathsToDelete)
        
        if (storageError) {
          console.error('Fotoğraf silme hatası:', storageError)
          // Storage hatası olsa da devam et
        }
      }
    }
    
    // Fotoğraf kayıtlarını sil
    await supabase
      .from('evrak_fotograflari')
      .delete()
      .eq('evrak_id', evrakId)
    
    // Hareket kayıtlarını sil
    await supabase
      .from('evrak_hareketleri')
      .delete()
      .eq('evrak_id', evrakId)
    
    // Evrakı sil
    const { error: deleteError } = await supabase
      .from('evraklar')
      .delete()
      .eq('id', evrakId)
    
    if (deleteError) {
      console.error('Evrak silme hatası:', deleteError)
      return serverErrorResponse('Evrak silinirken hata oluştu')
    }
    
    return successResponse({ message: 'Evrak silindi', id: evrakId })
    
  } catch (error) {
    if (isAuthError(error)) {
      return error.status === 401 
        ? unauthorizedResponse(error.message)
        : forbiddenResponse(error.message)
    }
    console.error('Evrak DELETE hatası:', error)
    return serverErrorResponse()
  }
}
