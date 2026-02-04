// ============================================
// ÇekSenet Web - Günlük Rapor Veri Toplama
// ============================================

import { createClient } from '@/lib/supabase/server';
import { formatCurrency } from '@/lib/utils/format';

export interface DailyReportData {
  // Günlük istatistikler
  dailyStats: {
    newEvraklar: number;
    statusChanges: number;
    totalAmount: number;
    currency: string;
  };
  
  // Yeni eklenen evraklar
  newEvraklar: Array<{
    id: number;
    evrak_tipi: 'cek' | 'senet';
    evrak_no: string;
    tutar: number;
    para_birimi: string;
    vade_tarihi: string;
    cari_adi?: string;
    created_at: string;
  }>;
  
  // Yaklaşan vadeli evraklar (7 gün içinde)
  upcomingEvraklar: Array<{
    id: number;
    evrak_tipi: 'cek' | 'senet';
    evrak_no: string;
    tutar: number;
    para_birimi: string;
    vade_tarihi: string;
    kalan_gun: number;
    cari_adi?: string;
  }>;
  
  // Yaklaşan kredi taksitleri (7 gün içinde)
  upcomingTaksitler: Array<{
    id: number;
    kredi_id: number;
    taksit_no: number;
    tutar: number;
    para_birimi: string;
    vade_tarihi: string;
    kalan_gun: number;
    banka_adi?: string;
  }>;
  
  // Durumu değişen evraklar
  statusChangedEvraklar: Array<{
    id: number;
    evrak_no: string;
    eski_durum: string;
    yeni_durum: string;
    degisim_tarihi: string;
    cari_adi?: string;
  }>;
  
  // Tarih aralığı
  reportDateRange: {
    startDate: string;
    endDate: string;
    reportDate: string;
  };
}

/**
 * Günlük rapor verilerini toplama servisi
 */
export class DailyReportService {
  private supabase: any;

  constructor() {
    // Supabase client'ı async olarak oluşturulacak
  }

  async initialize() {
    this.supabase = await createClient();
  }

  /**
   * Günlük rapor verilerini topla
   */
  async collectDailyReport(): Promise<DailyReportData> {
    if (!this.supabase) await this.initialize();

    // Tarih aralıklarını belirle
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Bugünün başlangıcı ve dünün sonu
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);
    
    const yesterdayStart = new Date(yesterday);
    yesterdayStart.setHours(0, 0, 0, 0);
    
    const yesterdayEnd = new Date(yesterday);
    yesterdayEnd.setHours(23, 59, 59, 999);

    // 7 gün sonrası
    const sevenDaysLater = new Date(today);
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

    try {
      // 1. Dün eklenen evraklar
      const { data: newEvraklar, error: newEvraklarError } = await this.supabase
        .from('evraklar')
        .select(`
          id,
          evrak_tipi,
          evrak_no,
          tutar,
          para_birimi,
          vade_tarihi,
          created_at,
          cari:cariler(ad_soyad)
        `)
        .gte('created_at', yesterdayStart.toISOString())
        .lte('created_at', yesterdayEnd.toISOString())
        .order('created_at', { ascending: false });

      if (newEvraklarError) {
        console.error('Yeni evraklar alınırken hata:', newEvraklarError);
      }

      // 2. Dün durumu değişen evraklar
      const { data: statusChanges, error: statusChangesError } = await this.supabase
        .from('evrak_hareketleri')
        .select(`
          id,
          evrak_id,
          eski_durum,
          yeni_durum,
          created_at,
          evrak:evraklar(id, evrak_no, cari:cariler(ad_soyad))
        `)
        .gte('created_at', yesterdayStart.toISOString())
        .lte('created_at', yesterdayEnd.toISOString())
        .order('created_at', { ascending: false });

      if (statusChangesError) {
        console.error('Durum değişiklikleri alınırken hata:', statusChangesError);
      }

      // 3. 7 gün içinde vadesi gelecek evraklar
      const { data: upcomingEvraklar, error: upcomingEvraklarError } = await this.supabase
        .from('evraklar')
        .select(`
          id,
          evrak_tipi,
          evrak_no,
          tutar,
          para_birimi,
          vade_tarihi,
          cari:cariler(ad_soyad)
        `)
        .gte('vade_tarihi', todayStart.toISOString().split('T')[0])
        .lte('vade_tarihi', sevenDaysLater.toISOString().split('T')[0])
        .order('vade_tarihi', { ascending: true });

      if (upcomingEvraklarError) {
        console.error('Yaklaşan evraklar alınırken hata:', upcomingEvraklarError);
      }

      // 4. 7 gün içinde ödeme tarihi olan kredi taksitleri
      const { data: upcomingTaksitler, error: upcomingTaksitlerError } = await this.supabase
        .from('kredi_taksitler')
        .select(`
          id,
          kredi_id,
          taksit_no,
          tutar,
          vade_tarihi,
          durum,
          kredi:krediler(banka:bankalar(ad), para_birimi)
        `)
        .eq('durum', 'bekliyor')
        .gte('vade_tarihi', todayStart.toISOString().split('T')[0])
        .lte('vade_tarihi', sevenDaysLater.toISOString().split('T')[0])
        .order('vade_tarihi', { ascending: true });

      if (upcomingTaksitlerError) {
        console.error('Yaklaşan taksitler alınırken hata:', upcomingTaksitlerError);
      }

      // Verileri işle ve formatla
      const processedNewEvraklar = (newEvraklar || []).map((evrak: any) => ({
        id: evrak.id,
        evrak_tipi: evrak.evrak_tipi,
        evrak_no: evrak.evrak_no,
        tutar: evrak.tutar,
        para_birimi: evrak.para_birimi || 'TRY',
        vade_tarihi: evrak.vade_tarihi,
        cari_adi: evrak.cari?.ad_soyad,
        created_at: evrak.created_at
      }));

      const processedStatusChanges = (statusChanges || []).map((change: any) => ({
        id: change.evrak_id,
        evrak_no: change.evrak?.evrak_no || 'Bilinmiyor',
        eski_durum: change.eski_durum || '-',
        yeni_durum: change.yeni_durum,
        degisim_tarihi: change.created_at,
        cari_adi: change.evrak?.cari?.ad_soyad
      }));

      // Yaklaşan evraklara kalan gün hesaplaması ekle
      const processedUpcomingEvraklar = (upcomingEvraklar || []).map((evrak: any) => {
        const vadeDate = new Date(evrak.vade_tarihi);
        const timeDiff = vadeDate.getTime() - todayStart.getTime();
        const kalanGun = Math.ceil(timeDiff / (1000 * 3600 * 24));
        
        return {
          id: evrak.id,
          evrak_tipi: evrak.evrak_tipi,
          evrak_no: evrak.evrak_no,
          tutar: evrak.tutar,
          para_birimi: evrak.para_birimi || 'TRY',
          vade_tarihi: evrak.vade_tarihi,
          kalan_gun: kalanGun,
          cari_adi: evrak.cari?.ad_soyad
        };
      });

      // Yaklaşan taksitlere kalan gün hesaplaması ekle
      const processedUpcomingTaksitler = (upcomingTaksitler || []).map((taksit: any) => {
        const vadeDate = new Date(taksit.vade_tarihi);
        const timeDiff = vadeDate.getTime() - todayStart.getTime();
        const kalanGun = Math.ceil(timeDiff / (1000 * 3600 * 24));
        
        return {
          id: taksit.id,
          kredi_id: taksit.kredi_id,
          taksit_no: taksit.taksit_no,
          tutar: taksit.tutar,
          para_birimi: taksit.kredi?.para_birimi || 'TRY',
          vade_tarihi: taksit.vade_tarihi,
          kalan_gun: kalanGun,
          banka_adi: taksit.kredi?.banka?.ad
        };
      });

      // Günlük istatistikleri hesapla
      const totalAmount = processedNewEvraklar.reduce((sum: number, evrak: any) => {
        // Para birimi dönüşümü yapılabilir, şimdilik sadece TRY topluyoruz
        return sum + (evrak.tutar || 0);
      }, 0);

      // Rapor verilerini döndür
      return {
        dailyStats: {
          newEvraklar: processedNewEvraklar.length,
          statusChanges: processedStatusChanges.length,
          totalAmount: parseFloat(totalAmount.toFixed(2)),
          currency: 'TRY'
        },
        newEvraklar: processedNewEvraklar,
        upcomingEvraklar: processedUpcomingEvraklar,
        upcomingTaksitler: processedUpcomingTaksitler,
        statusChangedEvraklar: processedStatusChanges,
        reportDateRange: {
          startDate: yesterdayStart.toISOString().split('T')[0],
          endDate: yesterdayEnd.toISOString().split('T')[0],
          reportDate: today.toISOString().split('T')[0]
        }
      };

    } catch (error) {
      console.error('Günlük rapor verileri toplanırken hata:', error);
      
      // Hata durumunda boş rapor döndür
      return {
        dailyStats: {
          newEvraklar: 0,
          statusChanges: 0,
          totalAmount: 0,
          currency: 'TRY'
        },
        newEvraklar: [],
        upcomingEvraklar: [],
        upcomingTaksitler: [],
        statusChangedEvraklar: [],
        reportDateRange: {
          startDate: yesterdayStart.toISOString().split('T')[0],
          endDate: yesterdayEnd.toISOString().split('T')[0],
          reportDate: today.toISOString().split('T')[0]
        }
      };
    }
  }

  /**
   * Günlük raporu JSON formatında al (API için)
   */
  async getDailyReportJSON() {
    const reportData = await this.collectDailyReport();
    return {
      success: true,
      timestamp: new Date().toISOString(),
      data: reportData
    };
  }

  /**
   * Basit özet istatistikleri al (dashboard için)
   */
  async getDailySummary() {
    const reportData = await this.collectDailyReport();
    
    return {
      newEvraklar: reportData.dailyStats.newEvraklar,
      statusChanges: reportData.dailyStats.statusChanges,
      totalAmount: reportData.dailyStats.totalAmount,
      upcomingEvraklar: reportData.upcomingEvraklar.length,
      upcomingTaksitler: reportData.upcomingTaksitler.length,
      reportDate: reportData.reportDateRange.reportDate
    };
  }
}

// Singleton instance
export const dailyReportService = new DailyReportService();