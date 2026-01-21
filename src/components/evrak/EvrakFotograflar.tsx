'use client'

// ============================================
// CekSenet Web - Evrak Fotoğrafları Componenti
// ============================================

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Text } from '@/components/ui/text'
import Lightbox from 'yet-another-react-lightbox'
import 'yet-another-react-lightbox/styles.css'
import {
  PhotoIcon,
  TrashIcon,
  ArrowPathIcon,
  PlusIcon,
  XMarkIcon,
} from '@heroicons/react/20/solid'

// ============================================
// Types
// ============================================

interface Fotograf {
  id: number
  evrak_id: number
  dosya_adi: string
  storage_path: string
  dosya_boyutu: number | null
  mime_type: string | null
  url: string | null
  created_at: string
}

interface EvrakFotograflarProps {
  evrakId: number
  fotograflar: Fotograf[]
  onRefresh: () => void
}

// ============================================
// Component
// ============================================

export default function EvrakFotograflar({
  evrakId,
  fotograflar,
  onRefresh,
}: EvrakFotograflarProps) {
  // State
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  // ============================================
  // Upload Handler
  // ============================================

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setIsUploading(true)
    setUploadError(null)

    try {
      // Tek tek yükle
      for (const file of Array.from(files)) {
        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch(`/api/evraklar/${evrakId}/fotograflar`, {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          const result = await response.json()
          throw new Error(result.error || 'Yükleme başarısız')
        }
      }

      // Listeyi yenile
      onRefresh()
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Yükleme hatası')
    } finally {
      setIsUploading(false)
      // Input'u temizle
      e.target.value = ''
    }
  }, [evrakId, onRefresh])

  // ============================================
  // Delete Handler
  // ============================================

  const handleDelete = useCallback(async (fotoId: number) => {
    if (!confirm('Bu fotoğrafı silmek istediğinize emin misiniz?')) return

    setDeletingId(fotoId)

    try {
      const response = await fetch(`/api/evraklar/${evrakId}/fotograflar/${fotoId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Silme başarısız')
      }

      // Listeyi yenile
      onRefresh()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Silme hatası')
    } finally {
      setDeletingId(null)
    }
  }, [evrakId, onRefresh])

  // ============================================
  // Lightbox Handler
  // ============================================

  const openLightbox = (index: number) => {
    setLightboxIndex(index)
    setLightboxOpen(true)
  }

  // Lightbox için slides
  const slides = fotograflar
    .filter(f => f.url)
    .map(f => ({
      src: f.url!,
      alt: f.dosya_adi,
    }))

  // ============================================
  // Format file size
  // ============================================

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // ============================================
  // Render
  // ============================================

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PhotoIcon className="h-5 w-5 text-zinc-400" />
          <Text className="font-medium">
            Fotoğraflar ({fotograflar.length})
          </Text>
        </div>

        {/* Upload Button */}
        <label>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            onChange={handleUpload}
            disabled={isUploading}
            className="hidden"
          />
          <Button
            type="button"
            color="blue"
            disabled={isUploading}
            className="cursor-pointer"
            onClick={(e) => {
              // Label içinde button olunca tıklama çakışmasın
              const input = (e.currentTarget as HTMLElement).parentElement?.querySelector('input')
              input?.click()
            }}
          >
            {isUploading ? (
              <>
                <ArrowPathIcon className="h-5 w-5 animate-spin" />
                Yükleniyor...
              </>
            ) : (
              <>
                <PlusIcon className="h-5 w-5" />
                Fotoğraf Ekle
              </>
            )}
          </Button>
        </label>
      </div>

      {/* Upload Error */}
      {uploadError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {uploadError}
          <button
            onClick={() => setUploadError(null)}
            className="ml-2 text-red-500 hover:text-red-700"
          >
            <XMarkIcon className="inline h-4 w-4" />
          </button>
        </div>
      )}

      {/* Empty State */}
      {fotograflar.length === 0 && (
        <div className="rounded-lg border-2 border-dashed border-zinc-200 p-8 text-center">
          <PhotoIcon className="mx-auto h-12 w-12 text-zinc-300" />
          <Text className="mt-2 text-zinc-500">
            Henüz fotoğraf eklenmemiş
          </Text>
          <Text className="text-sm text-zinc-400">
            Evrak görsellerini yüklemek için yukarıdaki butonu kullanın
          </Text>
        </div>
      )}

      {/* Photo Grid */}
      {fotograflar.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {fotograflar.map((foto, index) => (
            <div
              key={foto.id}
              className="group relative aspect-square overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50"
            >
              {foto.url ? (
                <>
                  {/* Image */}
                  <img
                    src={foto.url}
                    alt={foto.dosya_adi}
                    className="h-full w-full cursor-pointer object-cover transition-transform group-hover:scale-105"
                    onClick={() => openLightbox(index)}
                  />

                  {/* Overlay - pointer-events-none ile tıklamayı engellemesin */}
                  <div className="pointer-events-none absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/20" />

                  {/* Delete Button */}
                  <button
                    onClick={() => handleDelete(foto.id)}
                    disabled={deletingId === foto.id}
                    className="absolute right-2 top-2 rounded-full bg-red-500 p-1.5 text-white opacity-0 transition-opacity hover:bg-red-600 group-hover:opacity-100 disabled:opacity-50"
                  >
                    {deletingId === foto.id ? (
                      <ArrowPathIcon className="h-4 w-4 animate-spin" />
                    ) : (
                      <TrashIcon className="h-4 w-4" />
                    )}
                  </button>

                  {/* File Info - pointer-events-none */}
                  <div className="pointer-events-none absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <p className="truncate text-xs text-white">
                      {foto.dosya_adi}
                    </p>
                    {foto.dosya_boyutu && (
                      <p className="text-xs text-white/70">
                        {formatFileSize(foto.dosya_boyutu)}
                      </p>
                    )}
                  </div>
                </>
              ) : (
                // URL yoksa placeholder
                <div className="flex h-full items-center justify-center">
                  <PhotoIcon className="h-8 w-8 text-zinc-300" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      <Lightbox
        open={lightboxOpen}
        close={() => setLightboxOpen(false)}
        index={lightboxIndex}
        slides={slides}
      />
    </div>
  )
}
