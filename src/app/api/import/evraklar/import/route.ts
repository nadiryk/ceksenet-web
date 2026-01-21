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
import { ParsedRow } from '@/lib/excelParser'

/**
 * POST /api/import/evraklar/import
 * Parse edilmiş ve onaylanmış satırları veritabanına kaydet
 * 
 * Request Body:
 * - satirlar: ParsedRow[] (parse'dan dönen, seçilmiş olanlar)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    
    const body = await request.json()
    const { satirlar } = body as { satirlar: ParsedRow[] }
    
    // Validation
    if (!satirlar || !Array.isArray(satirlar) || satirlar.length === 0) {
      return errorResponse('Import edilecek satır bulunamadı')
    }
    
    // Sadece geçerli satırları filtrele
    const gecerliSatirlar = satirlar.filter(s => s.gecerli === true)
    
    if (gecerliSatirlar.length === 0) {
      return errorResponse('Geçerli satır bulunamadı. Lütfen hatalı satırları düzeltin.')
    }
    
    const supabase = await createClient()
    
    // Sonuç takibi
    const sonuc = {
      basarili: 0,
      basarisiz: 0,
      hatalar: [] as Array<{ satir: number; evrak_no?: string; hata: string }>
    }
    
    // Her satırı işle
    for (const satir of gecerliSatirlar) {
      try {
        // Evrak oluştur
        const { data: evrak, error: evrakError } = await supabase
          .from('evraklar')
          .insert({
            evrak_tipi: satir.evrak_tipi,
            evrak_no: satir.evrak_no,
            tutar: satir.tutar,
            para_birimi: satir.para_birimi || 'TRY',
            doviz_kuru: satir.doviz_kuru || null,
            evrak_tarihi: satir.evrak_tarihi || null,
            vade_tarihi: satir.vade_tarihi,
            banka_adi: satir.banka_adi || null,
            kesideci: satir.kesideci || null,
            cari_id: satir.cari_id || null,
            durum: satir.durum || 'portfoy',
            notlar: satir.notlar || null,
            created_by: user.id
          })
          .select('id')
          .single()
        
        if (evrakError) {
          throw new Error(evrakError.message)
        }
        
        // İlk hareket kaydı oluştur
        if (evrak) {
          await supabase
            .from('evrak_hareketleri')
            .insert({
              evrak_id: evrak.id,
              eski_durum: null,
              yeni_durum: satir.durum || 'portfoy',
              aciklama: 'Excel import ile oluşturuldu',
              created_by: user.id
            })
        }
        
        sonuc.basarili++
        
      } catch (error) {
        sonuc.basarisiz++
        sonuc.hatalar.push({
          satir: satir.satir,
          evrak_no: satir.evrak_no,
          hata: error instanceof Error ? error.message : 'Bilinmeyen hata'
        })
      }
    }
    
    return successResponse({
      success: sonuc.basarili > 0,
      sonuc
    })
    
  } catch (error) {
    if (isAuthError(error)) {
      return error.status === 401 
        ? unauthorizedResponse(error.message)
        : forbiddenResponse(error.message)
    }
    
    console.error('Import hatası:', error)
    return serverErrorResponse('Import sırasında bir hata oluştu')
  }
}
