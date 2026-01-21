// ============================================
// CekSenet Web - Supabase Storage Helpers
// ============================================

import { createClient } from '@/lib/supabase/server'

const BUCKET_NAME = 'evrak-fotograflari'

// ============================================
// Types
// ============================================

export interface UploadResult {
  path: string
  fullPath: string
}

// ============================================
// Upload Fotoğraf
// ============================================

export async function uploadEvrakFoto(
  evrakId: number,
  file: File
): Promise<UploadResult> {
  const supabase = await createClient()
  
  // Benzersiz dosya adı oluştur
  const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`
  const filePath = `${evrakId}/${fileName}`
  
  // Upload
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    })
  
  if (error) {
    console.error('Storage upload error:', error)
    throw new Error(`Dosya yüklenemedi: ${error.message}`)
  }
  
  return {
    path: filePath,
    fullPath: data.fullPath
  }
}

// ============================================
// Delete Fotoğraf
// ============================================

export async function deleteEvrakFoto(storagePath: string): Promise<void> {
  const supabase = await createClient()
  
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([storagePath])
  
  if (error) {
    console.error('Storage delete error:', error)
    throw new Error(`Dosya silinemedi: ${error.message}`)
  }
}

// ============================================
// Get Signed URL (Private bucket için)
// ============================================

export async function getSignedUrl(
  storagePath: string,
  expiresIn: number = 3600 // 1 saat
): Promise<string> {
  const supabase = await createClient()
  
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(storagePath, expiresIn)
  
  if (error) {
    console.error('Signed URL error:', error)
    throw new Error(`URL oluşturulamadı: ${error.message}`)
  }
  
  return data.signedUrl
}

// ============================================
// Get Multiple Signed URLs
// ============================================

export async function getSignedUrls(
  storagePaths: string[],
  expiresIn: number = 3600
): Promise<Map<string, string>> {
  const supabase = await createClient()
  
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrls(storagePaths, expiresIn)
  
  if (error) {
    console.error('Signed URLs error:', error)
    throw new Error(`URL\'ler oluşturulamadı: ${error.message}`)
  }
  
  const urlMap = new Map<string, string>()
  data.forEach((item) => {
    if (item.signedUrl && item.path) {
      urlMap.set(item.path, item.signedUrl)
    }
  })
  
  return urlMap
}

// ============================================
// Bucket name export (API'ler için)
// ============================================

export { BUCKET_NAME }
