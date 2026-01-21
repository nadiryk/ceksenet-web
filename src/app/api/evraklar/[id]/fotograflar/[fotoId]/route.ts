// ============================================
// CekSenet Web - Evrak Fotoğrafı Silme API
// DELETE: Tek fotoğraf sil
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { BUCKET_NAME } from '@/lib/storage'

// ============================================
// DELETE - Fotoğraf Sil
// ============================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; fotoId: string }> }
) {
  try {
    const { id, fotoId } = await params
    const evrakId = parseInt(id)
    const fotografId = parseInt(fotoId)
    
    if (isNaN(evrakId) || isNaN(fotografId)) {
      return NextResponse.json(
        { error: 'Geçersiz ID' },
        { status: 400 }
      )
    }
    
    const supabase = await createClient()
    
    // Auth kontrolü
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Oturum açmanız gerekiyor' },
        { status: 401 }
      )
    }
    
    // Fotoğrafı bul
    const { data: fotograf, error: findError } = await supabase
      .from('evrak_fotograflari')
      .select('*')
      .eq('id', fotografId)
      .eq('evrak_id', evrakId)
      .single()
    
    if (findError || !fotograf) {
      return NextResponse.json(
        { error: 'Fotoğraf bulunamadı' },
        { status: 404 }
      )
    }
    
    // Storage'dan sil
    const { error: storageError } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([fotograf.storage_path])
    
    if (storageError) {
      console.error('Storage silme hatası:', storageError)
      // Devam et, veritabanından da silelim
    }
    
    // Veritabanından sil
    const { error: dbError } = await supabase
      .from('evrak_fotograflari')
      .delete()
      .eq('id', fotografId)
    
    if (dbError) {
      console.error('DB silme hatası:', dbError)
      return NextResponse.json(
        { error: 'Fotoğraf silinemedi' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      message: 'Fotoğraf silindi'
    })
    
  } catch (error) {
    console.error('Fotoğraf silme hatası:', error)
    return NextResponse.json(
      { error: 'Sunucu hatası' },
      { status: 500 }
    )
  }
}
