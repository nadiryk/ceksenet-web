/**
 * TCMB Döviz Kuru Utility
 * TCMB'den güncel döviz kurlarını çeker ve Supabase'e kaydeder
 */

import { createClient } from '@/lib/supabase/server'

// TCMB XML URL
const TCMB_URL = 'https://www.tcmb.gov.tr/kurlar/today.xml'

// Desteklenen para birimleri
export const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'CHF'] as const
export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number] | 'TRY'

export interface KurlarResponse {
  kurlar: {
    TRY: number
    USD: number | null
    EUR: number | null
    GBP: number | null
    CHF: number | null
    tarih: string | null
  }
  cached: boolean
  stale?: boolean
  updated_at: string | null
  error?: string
  unavailable?: boolean
}

/**
 * TCMB XML'ini parse et
 * Basit regex-based parser (xml2js yerine)
 */
function parseTCMBXml(xml: string): { tarih: string; kurlar: Record<string, number> } {
  const kurlar: Record<string, number> = {}
  
  // Tarihi çek: <Tarih_Date Tarih="31.12.2025" ...>
  const tarihMatch = xml.match(/Tarih="([^"]+)"/)
  const tarih = tarihMatch ? tarihMatch[1] : new Date().toLocaleDateString('tr-TR')
  
  // Her Currency bloğunu bul
  const currencyBlocks = xml.match(/<Currency[^>]*>[\s\S]*?<\/Currency>/g) || []
  
  for (const block of currencyBlocks) {
    // Kod: <Currency ... Kod="USD" ...>
    const kodMatch = block.match(/Kod="([^"]+)"/)
    if (!kodMatch) continue
    
    const kod = kodMatch[1]
    if (!SUPPORTED_CURRENCIES.includes(kod as typeof SUPPORTED_CURRENCIES[number])) continue
    
    // ForexBuying değeri: <ForexBuying>35.1234</ForexBuying>
    const forexMatch = block.match(/<ForexBuying>([^<]+)<\/ForexBuying>/)
    if (!forexMatch || forexMatch[1] === '') continue
    
    const kur = parseFloat(forexMatch[1].replace(',', '.'))
    if (!isNaN(kur) && kur > 0) {
      kurlar[kod] = kur
    }
  }
  
  return { tarih, kurlar }
}

/**
 * TCMB'den kurları çek
 */
async function fetchFromTCMB(): Promise<{ tarih: string; kurlar: Record<string, number> }> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 saniye timeout
  
  try {
    const response = await fetch(TCMB_URL, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'CekSenet/1.0',
        'Accept': 'application/xml'
      }
    })
    
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      throw new Error(`TCMB HTTP error: ${response.status}`)
    }
    
    const xmlData = await response.text()
    return parseTCMBXml(xmlData)
    
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('TCMB bağlantı zaman aşımı (timeout)')
    }
    throw error
  }
}

/**
 * Tarihi YYYY-MM-DD formatına çevir
 * Input: "31.12.2025" veya "2025-12-31"
 */
function formatDateForDB(tarih: string): string {
  if (tarih.includes('-')) return tarih // Zaten doğru format
  
  const parts = tarih.split('.')
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`
  }
  return tarih
}

/**
 * Bugünün tarihini YYYY-MM-DD formatında döndür
 */
function getTodayDate(): string {
  return new Date().toISOString().split('T')[0]
}

/**
 * Kurları getir (Supabase cache'den veya TCMB'den)
 */
export async function getKurlar(forceRefresh = false): Promise<KurlarResponse> {
  const supabase = await createClient()
  const today = getTodayDate()
  
  // Önce Supabase'den bugünün verisine bak
  if (!forceRefresh) {
    const { data: cachedKur } = await supabase
      .from('doviz_kurlari')
      .select('*')
      .eq('tarih', today)
      .single()
    
    if (cachedKur) {
      return {
        kurlar: {
          TRY: 1,
          USD: cachedKur.usd,
          EUR: cachedKur.eur,
          GBP: cachedKur.gbp,
          CHF: cachedKur.chf,
          tarih: cachedKur.tarih
        },
        cached: true,
        updated_at: cachedKur.created_at
      }
    }
  }
  
  // TCMB'den çekmeyi dene
  try {
    const { tarih, kurlar } = await fetchFromTCMB()
    const dbTarih = formatDateForDB(tarih)
    
    // Supabase'e kaydet (upsert - varsa güncelle, yoksa ekle)
    const { error: upsertError } = await supabase
      .from('doviz_kurlari')
      .upsert({
        tarih: dbTarih,
        usd: kurlar.USD || null,
        eur: kurlar.EUR || null,
        gbp: kurlar.GBP || null,
        chf: kurlar.CHF || null
      }, { onConflict: 'tarih' })
    
    if (upsertError) {
      console.error('Döviz kuru kaydetme hatası:', upsertError)
    }
    
    return {
      kurlar: {
        TRY: 1,
        USD: kurlar.USD || null,
        EUR: kurlar.EUR || null,
        GBP: kurlar.GBP || null,
        CHF: kurlar.CHF || null,
        tarih: dbTarih
      },
      cached: false,
      updated_at: new Date().toISOString()
    }
    
  } catch (error) {
    console.error('TCMB kur çekme hatası:', error)
    
    // Hata durumunda en son kaydedilen veriyi kullan
    const { data: lastKur } = await supabase
      .from('doviz_kurlari')
      .select('*')
      .order('tarih', { ascending: false })
      .limit(1)
      .single()
    
    if (lastKur) {
      return {
        kurlar: {
          TRY: 1,
          USD: lastKur.usd,
          EUR: lastKur.eur,
          GBP: lastKur.gbp,
          CHF: lastKur.chf,
          tarih: lastKur.tarih
        },
        cached: true,
        stale: true,
        updated_at: lastKur.created_at,
        error: 'TCMB erişilemedi, eski veriler gösteriliyor'
      }
    }
    
    // Hiç veri yoksa
    return {
      kurlar: {
        TRY: 1,
        USD: null,
        EUR: null,
        GBP: null,
        CHF: null,
        tarih: null
      },
      cached: false,
      error: 'TCMB erişilemedi ve kayıtlı veri yok. Kurları manuel girin.',
      unavailable: true,
      updated_at: null
    }
  }
}

/**
 * Tek bir para birimi için kur getir
 */
export async function getKur(paraBirimi: SupportedCurrency): Promise<number | null> {
  if (paraBirimi === 'TRY') return 1
  
  const result = await getKurlar()
  return result.kurlar[paraBirimi] || null
}

/**
 * Cache durumunu getir
 */
export async function getCacheStatus(): Promise<{
  hasData: boolean
  lastUpdate: string | null
  lastTarih: string | null
}> {
  const supabase = await createClient()
  
  const { data } = await supabase
    .from('doviz_kurlari')
    .select('tarih, created_at')
    .order('tarih', { ascending: false })
    .limit(1)
    .single()
  
  return {
    hasData: !!data,
    lastUpdate: data?.created_at || null,
    lastTarih: data?.tarih || null
  }
}
