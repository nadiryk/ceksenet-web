// Supabase Database Types
// Bu dosya Supabase CLI ile otomatik generate edilebilir
// npx supabase gen types typescript --project-id nkcqbbtlxvggztgnygfp > src/types/database.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          ad_soyad: string
          role: 'admin' | 'normal'
          created_at: string
          last_login: string | null
        }
        Insert: {
          id: string
          username: string
          ad_soyad: string
          role?: 'admin' | 'normal'
          created_at?: string
          last_login?: string | null
        }
        Update: {
          id?: string
          username?: string
          ad_soyad?: string
          role?: 'admin' | 'normal'
          created_at?: string
          last_login?: string | null
        }
      }
      bankalar: {
        Row: {
          id: number
          ad: string
          aktif: boolean
          created_at: string
        }
        Insert: {
          id?: number
          ad: string
          aktif?: boolean
          created_at?: string
        }
        Update: {
          id?: number
          ad?: string
          aktif?: boolean
          created_at?: string
        }
      }
      cariler: {
        Row: {
          id: number
          ad_soyad: string
          tip: 'musteri' | 'tedarikci'
          telefon: string | null
          email: string | null
          adres: string | null
          vergi_no: string | null
          notlar: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: number
          ad_soyad: string
          tip: 'musteri' | 'tedarikci'
          telefon?: string | null
          email?: string | null
          adres?: string | null
          vergi_no?: string | null
          notlar?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: number
          ad_soyad?: string
          tip?: 'musteri' | 'tedarikci'
          telefon?: string | null
          email?: string | null
          adres?: string | null
          vergi_no?: string | null
          notlar?: string | null
          created_at?: string
          updated_at?: string | null
        }
      }
      evraklar: {
        Row: {
          id: number
          evrak_tipi: 'cek' | 'senet'
          evrak_no: string
          tutar: number
          para_birimi: 'TRY' | 'USD' | 'EUR' | 'GBP' | 'CHF'
          doviz_kuru: number | null
          evrak_tarihi: string | null
          vade_tarihi: string
          banka_id: number | null
          banka_adi: string | null
          kesideci: string | null
          cari_id: number | null
          durum: 'portfoy' | 'bankada' | 'ciro' | 'tahsil' | 'karsiliksiz'
          notlar: string | null
          created_at: string
          updated_at: string | null
          created_by: string | null
        }
        Insert: {
          id?: number
          evrak_tipi: 'cek' | 'senet'
          evrak_no: string
          tutar: number
          para_birimi?: 'TRY' | 'USD' | 'EUR' | 'GBP' | 'CHF'
          doviz_kuru?: number | null
          evrak_tarihi?: string | null
          vade_tarihi: string
          banka_id?: number | null
          banka_adi?: string | null
          kesideci?: string | null
          cari_id?: number | null
          durum?: 'portfoy' | 'bankada' | 'ciro' | 'tahsil' | 'karsiliksiz'
          notlar?: string | null
          created_at?: string
          updated_at?: string | null
          created_by?: string | null
        }
        Update: {
          id?: number
          evrak_tipi?: 'cek' | 'senet'
          evrak_no?: string
          tutar?: number
          para_birimi?: 'TRY' | 'USD' | 'EUR' | 'GBP' | 'CHF'
          doviz_kuru?: number | null
          evrak_tarihi?: string | null
          vade_tarihi?: string
          banka_id?: number | null
          banka_adi?: string | null
          kesideci?: string | null
          cari_id?: number | null
          durum?: 'portfoy' | 'bankada' | 'ciro' | 'tahsil' | 'karsiliksiz'
          notlar?: string | null
          created_at?: string
          updated_at?: string | null
          created_by?: string | null
        }
      }
      evrak_hareketleri: {
        Row: {
          id: number
          evrak_id: number
          eski_durum: string | null
          yeni_durum: string
          aciklama: string | null
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: number
          evrak_id: number
          eski_durum?: string | null
          yeni_durum: string
          aciklama?: string | null
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: number
          evrak_id?: number
          eski_durum?: string | null
          yeni_durum?: string
          aciklama?: string | null
          created_at?: string
          created_by?: string | null
        }
      }
      evrak_fotograflari: {
        Row: {
          id: number
          evrak_id: number
          dosya_adi: string
          storage_path: string
          thumbnail_path: string | null
          dosya_boyutu: number | null
          mime_type: string | null
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: number
          evrak_id: number
          dosya_adi: string
          storage_path: string
          thumbnail_path?: string | null
          dosya_boyutu?: number | null
          mime_type?: string | null
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: number
          evrak_id?: number
          dosya_adi?: string
          storage_path?: string
          thumbnail_path?: string | null
          dosya_boyutu?: number | null
          mime_type?: string | null
          created_at?: string
          created_by?: string | null
        }
      }
      krediler: {
        Row: {
          id: number
          banka_id: number | null
          kredi_turu: 'tuketici' | 'konut' | 'tasit' | 'ticari' | 'isletme' | 'diger'
          anapara: number
          faiz_orani: number
          vade_ay: number
          baslangic_tarihi: string
          aylik_taksit: number
          toplam_odeme: number | null
          para_birimi: 'TRY' | 'USD' | 'EUR' | 'GBP' | 'CHF'
          notlar: string | null
          durum: 'aktif' | 'kapandi' | 'erken_kapandi'
          created_at: string
          updated_at: string | null
          created_by: string | null
        }
        Insert: {
          id?: number
          banka_id?: number | null
          kredi_turu: 'tuketici' | 'konut' | 'tasit' | 'ticari' | 'isletme' | 'diger'
          anapara: number
          faiz_orani: number
          vade_ay: number
          baslangic_tarihi: string
          aylik_taksit: number
          toplam_odeme?: number | null
          para_birimi?: 'TRY' | 'USD' | 'EUR' | 'GBP' | 'CHF'
          notlar?: string | null
          durum?: 'aktif' | 'kapandi' | 'erken_kapandi'
          created_at?: string
          updated_at?: string | null
          created_by?: string | null
        }
        Update: {
          id?: number
          banka_id?: number | null
          kredi_turu?: 'tuketici' | 'konut' | 'tasit' | 'ticari' | 'isletme' | 'diger'
          anapara?: number
          faiz_orani?: number
          vade_ay?: number
          baslangic_tarihi?: string
          aylik_taksit?: number
          toplam_odeme?: number | null
          para_birimi?: 'TRY' | 'USD' | 'EUR' | 'GBP' | 'CHF'
          notlar?: string | null
          durum?: 'aktif' | 'kapandi' | 'erken_kapandi'
          created_at?: string
          updated_at?: string | null
          created_by?: string | null
        }
      }
      kredi_taksitler: {
        Row: {
          id: number
          kredi_id: number
          taksit_no: number
          vade_tarihi: string
          tutar: number
          odeme_tarihi: string | null
          odenen_tutar: number | null
          durum: 'bekliyor' | 'odendi' | 'gecikti'
          notlar: string | null
          created_at: string
        }
        Insert: {
          id?: number
          kredi_id: number
          taksit_no: number
          vade_tarihi: string
          tutar: number
          odeme_tarihi?: string | null
          odenen_tutar?: number | null
          durum?: 'bekliyor' | 'odendi' | 'gecikti'
          notlar?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          kredi_id?: number
          taksit_no?: number
          vade_tarihi?: string
          tutar?: number
          odeme_tarihi?: string | null
          odenen_tutar?: number | null
          durum?: 'bekliyor' | 'odendi' | 'gecikti'
          notlar?: string | null
          created_at?: string
        }
      }
      ayarlar: {
        Row: {
          key: string
          value: string | null
        }
        Insert: {
          key: string
          value?: string | null
        }
        Update: {
          key?: string
          value?: string | null
        }
      }
    }
  }
}

// Helper Types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Banka = Database['public']['Tables']['bankalar']['Row']
export type Cari = Database['public']['Tables']['cariler']['Row']
export type Evrak = Database['public']['Tables']['evraklar']['Row']
export type EvrakHareket = Database['public']['Tables']['evrak_hareketleri']['Row']
export type EvrakFotograf = Database['public']['Tables']['evrak_fotograflari']['Row']
export type Kredi = Database['public']['Tables']['krediler']['Row']
export type KrediTaksit = Database['public']['Tables']['kredi_taksitler']['Row']
export type Ayar = Database['public']['Tables']['ayarlar']['Row']

// Döviz Kurları (ayrı tablo)
export interface DovizKuru {
  id: number
  tarih: string
  usd: number | null
  eur: number | null
  gbp: number | null
  chf: number | null
  created_at: string
}
