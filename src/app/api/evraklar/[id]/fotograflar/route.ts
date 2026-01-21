// ============================================
// CekSenet Web - Evrak Fotoğrafları API
// GET: Liste, POST: Yükle
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSignedUrls, BUCKET_NAME } from '@/lib/storage'

// ============================================
// GET - Fotoğraf Listesi
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const evrakId = parseInt(id)
    
    if (isNaN(evrakId)) {
      return NextResponse.json(
        { error: 'Geçersiz evrak ID' },
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
    
    // Fotoğrafları getir
    const { data: fotograflar, error } = await supabase
      .from('evrak_fotograflari')
      .select('*')
      .eq('evrak_id', evrakId)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Fotoğraf listesi hatası:', error)
      return NextResponse.json(
        { error: 'Fotoğraflar alınamadı' },
        { status: 500 }
      )
    }
    
    // Signed URL'leri oluştur
    if (fotograflar && fotograflar.length > 0) {
      const paths = fotograflar.map(f => f.storage_path)
      const urlMap = await getSignedUrls(paths)
      
      // URL'leri fotoğraflara ekle
      const fotograflarWithUrls = fotograflar.map(foto => ({
        ...foto,
        url: urlMap.get(foto.storage_path) || null
      }))
      
      return NextResponse.json({ data: fotograflarWithUrls })
    }
    
    return NextResponse.json({ data: [] })
    
  } catch (error) {
    console.error('Fotoğraf listesi hatası:', error)
    return NextResponse.json(
      { error: 'Sunucu hatası' },
      { status: 500 }
    )
  }
}

// ============================================
// POST - Fotoğraf Yükle
// ============================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const evrakId = parseInt(id)
    
    if (isNaN(evrakId)) {
      return NextResponse.json(
        { error: 'Geçersiz evrak ID' },
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
    
    // Evrak var mı kontrol et
    const { data: evrak, error: evrakError } = await supabase
      .from('evraklar')
      .select('id')
      .eq('id', evrakId)
      .single()
    
    if (evrakError || !evrak) {
      return NextResponse.json(
        { error: 'Evrak bulunamadı' },
        { status: 404 }
      )
    }
    
    // FormData'dan dosyayı al
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    
    if (!file) {
      return NextResponse.json(
        { error: 'Dosya bulunamadı' },
        { status: 400 }
      )
    }
    
    // Dosya tipi kontrolü
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Geçersiz dosya tipi. Sadece JPEG, PNG, WebP ve GIF kabul edilir.' },
        { status: 400 }
      )
    }
    
    // Dosya boyutu kontrolü (10MB)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'Dosya boyutu 10MB\'dan büyük olamaz' },
        { status: 400 }
      )
    }
    
    // Benzersiz dosya adı oluştur
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`
    const storagePath = `${evrakId}/${fileName}`
    
    // Storage'a yükle
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false
      })
    
    if (uploadError) {
      console.error('Storage upload hatası:', uploadError)
      return NextResponse.json(
        { error: 'Dosya yüklenemedi' },
        { status: 500 }
      )
    }
    
    // Veritabanına kaydet
    const { data: fotograf, error: dbError } = await supabase
      .from('evrak_fotograflari')
      .insert({
        evrak_id: evrakId,
        dosya_adi: file.name,
        storage_path: storagePath,
        dosya_boyutu: file.size,
        mime_type: file.type,
        created_by: user.id
      })
      .select()
      .single()
    
    if (dbError) {
      console.error('DB kayıt hatası:', dbError)
      // Storage'dan sil (rollback)
      await supabase.storage.from(BUCKET_NAME).remove([storagePath])
      return NextResponse.json(
        { error: 'Fotoğraf kaydedilemedi' },
        { status: 500 }
      )
    }
    
    // Signed URL oluştur
    const { data: urlData } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(storagePath, 3600)
    
    return NextResponse.json({
      data: {
        ...fotograf,
        url: urlData?.signedUrl || null
      }
    }, { status: 201 })
    
  } catch (error) {
    console.error('Fotoğraf yükleme hatası:', error)
    return NextResponse.json(
      { error: 'Sunucu hatası' },
      { status: 500 }
    )
  }
}
