import { createClient } from '@/lib/supabase/server';

export interface WhatsAppMessage {
  telefon: string;
  mesaj: string;
  evrak_id?: number;
  kredi_taksit_id?: number;
  cari_id?: number;
}

export interface WhatsAppLog {
  id: number;
  telefon: string;
  mesaj: string;
  durum: 'bekliyor' | 'gonderildi' | 'hata';
  hata_mesaji?: string;
  evrak_id?: number;
  kredi_taksit_id?: number;
  cari_id?: number;
  gonderim_tarihi?: string;
  created_at: string;
}

/**
 * WhatsApp mesaj gönderim servisi
 * 
 * Not: Gerçek WhatsApp gönderimi için entegrasyon gereklidir.
 * Bu fonksiyon şu an sadece log kaydı oluşturur.
 * Gerçek gönderim için `sendWhatsAppMessage` fonksiyonunu özelleştirin.
 */
export class WhatsAppService {
  private supabase: any;

  constructor() {
    // Supabase client'ı async olarak oluşturulacak
  }

  async initialize() {
    // Dummy Supabase URL'si ise bağlantı kurmaya çalışma
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl && supabaseUrl.includes('dummy')) {
      console.warn('Dummy Supabase URL tespit edildi, simülasyon modunda çalışılacak');
      this.supabase = null;
      return;
    }

    try {
      this.supabase = await createClient();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn('Supabase bağlantısı kurulamadı, simülasyon modunda çalışılacak:', errorMessage);
      this.supabase = null;
    }
  }

  /**
   * Bekleyen mesajları gönder
   */
  async processPendingMessages(): Promise<{ sent: number; failed: number }> {
    if (!this.supabase) await this.initialize();

    // Supabase bağlantısı yoksa simülasyon modunda çalış
    if (!this.supabase) {
      console.warn('Supabase bağlantısı yok, simülasyon modunda bekleyen mesaj işleniyor');
      console.log('Simülasyon: 0 bekleyen mesaj işlendi (veritabanı bağlantısı yok)');
      return { sent: 0, failed: 0 };
    }

    const { data: pendingMessages, error } = await this.supabase
      .from('whatsapp_loglari')
      .select('*')
      .eq('durum', 'bekliyor')
      .order('created_at', { ascending: true })
      .limit(10);

    if (error) {
      console.error('Bekleyen mesajlar alınırken hata:', error);
      return { sent: 0, failed: 0 };
    }

    // Eğer bekleyen mesaj yoksa log yaz
    if (!pendingMessages || pendingMessages.length === 0) {
      console.log('Bekleyen WhatsApp mesajı bulunamadı');
      return { sent: 0, failed: 0 };
    }

    console.log(`${pendingMessages.length} adet bekleyen WhatsApp mesajı işleniyor...`);

    let sent = 0;
    let failed = 0;

    for (const msg of pendingMessages) {
      try {
        const success = await this.sendMessage(msg);

        if (success) {
          await this.updateMessageStatus(msg.id, 'gonderildi');
          sent++;
          console.log(`Mesaj gönderildi (ID: ${msg.id}): ${msg.telefon}`);
        } else {
          await this.updateMessageStatus(msg.id, 'hata', 'Gönderim başarısız');
          failed++;
          console.warn(`Mesaj gönderilemedi (ID: ${msg.id}): ${msg.telefon}`);
        }
      } catch (error: any) {
        console.error(`Mesaj gönderim hatası (ID: ${msg.id}):`, error);
        await this.updateMessageStatus(msg.id, 'hata', error.message);
        failed++;
      }
    }

    console.log(`WhatsApp işleme tamamlandı: ${sent} başarılı, ${failed} başarısız`);
    return { sent, failed };
  }

  /**
   * Tekil mesaj gönder
   */
  async sendSingleMessage(message: WhatsAppMessage): Promise<boolean> {
    console.log('sendSingleMessage çağrıldı:', { telefon: message.telefon, mesajLength: message.mesaj.length });
    if (!this.supabase) await this.initialize();

    // Telefon numarası kontrolü
    if (!message.telefon || message.telefon.trim() === '') {
      console.error('WhatsApp gönderimi için telefon numarası belirtilmedi');
      return false;
    }

    // Supabase bağlantısı yoksa simülasyon modunda doğrudan gönder
    if (!this.supabase) {
      console.warn('Supabase bağlantısı yok, simülasyon modunda mesaj gönderiliyor');
      const simulatedLog: WhatsAppLog = {
        id: Date.now(),
        telefon: message.telefon,
        mesaj: message.mesaj,
        durum: 'bekliyor',
        evrak_id: message.evrak_id || undefined,
        kredi_taksit_id: message.kredi_taksit_id || undefined,
        cari_id: message.cari_id || undefined,
        gonderim_tarihi: new Date().toISOString(),
        created_at: new Date().toISOString()
      };
      try {
        const success = await this.sendMessage(simulatedLog);
        console.log(`Simülasyon sonucu: ${success ? 'başarılı' : 'başarısız'}`);
        return success;
      } catch (error: any) {
        console.error('Simülasyon gönderim hatası:', error);
        return false;
      }
    }

    // Önce log kaydı oluştur
    const { data: log, error: insertError } = await this.supabase
      .from('whatsapp_loglari')
      .insert({
        telefon: message.telefon,
        mesaj: message.mesaj,
        evrak_id: message.evrak_id || null,
        kredi_taksit_id: message.kredi_taksit_id || null,
        cari_id: message.cari_id || null,
        durum: 'bekliyor',
        gonderim_tarihi: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error('Log kaydı oluşturma hatası:', insertError);
      return false;
    }

    // Mesajı gönder
    try {
      console.log('sendMessage çağrılıyor...');
      const success = await this.sendMessage(log);
      console.log('sendMessage sonucu:', success);
      const newStatus = success ? 'gonderildi' : 'hata';
      const errorMsg = success ? undefined : 'Gönderim başarısız';

      await this.updateMessageStatus(log.id, newStatus, errorMsg);
      return success;
    } catch (error: any) {
      console.error('Mesaj gönderim hatası:', error);
      await this.updateMessageStatus(log.id, 'hata', error.message);
      return false;
    }
  }

  /**
   * Gerçek WhatsApp mesaj gönderim fonksiyonu
   * CallMeBot API kullanarak gerçek mesaj gönderir
   * Eğer API anahtarı yoksa simülasyon modunda çalışır
   */
  /**
   * Gerçek WhatsApp mesaj gönderim fonksiyonu
   * CallMeBot API kullanarak gerçek mesaj gönderir
   * Eğer API anahtarı yoksa simülasyon modunda çalışır
   */
  private async sendMessage(log: WhatsAppLog): Promise<boolean> {
    console.log(`WhatsApp gönderiliyor: ${log.telefon} - ${log.mesaj.substring(0, 50)}...`);

    // Ayarları veritabanından al
    let apiKey = process.env.WHATSAPP_API_KEY;
    let useRealApi = process.env.WHATSAPP_USE_REAL_API === 'true';

    try {
      if (!this.supabase) await this.initialize();

      if (this.supabase) {
        const { data: settings } = await this.supabase
          .from('ayarlar')
          .select('key, value')
          .in('key', ['whatsapp_api_key', 'whatsapp_aktif']);

        if (settings) {
          const keySetting = settings.find((s: any) => s.key === 'whatsapp_api_key');
          const activeSetting = settings.find((s: any) => s.key === 'whatsapp_aktif');

          if (keySetting?.value) apiKey = keySetting.value;
          if (activeSetting?.value) useRealApi = activeSetting.value === 'true';
        }
      }
    } catch (error) {
      console.warn('WhatsApp ayarları veritabanından alınamadı, env vars kullanılıyor');
    }

    // Eğer gerçek API kullanımı aktif değilse veya API anahtarı yoksa simülasyon modunda çalış
    if (!useRealApi || !apiKey) {
      console.warn('WhatsApp API anahtarı bulunamadı veya gönderim kapalı. Simülasyon modunda çalışılıyor.');
      console.log(`Simülasyon Detayı: API Key: ${apiKey ? '***' : 'YOK'}, Aktif: ${useRealApi}`);

      // Simülasyon: her zaman başarılı (geliştirme ortamı)
      return true;
    }

    // CallMeBot API gönderimi (Aynı kalacak)
    try {
      const url = `https://api.callmebot.com/whatsapp.php?phone=${log.telefon}&text=${encodeURIComponent(log.mesaj)}&apikey=${apiKey}`;
      console.log(`CallMeBot API çağrısı: ${url.replace(apiKey, '***')}`);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'CekSenetWeb/1.0'
        }
      });

      const responseText = await response.text();
      // ... (rest is same)
      console.log(`CallMeBot API yanıtı: ${response.status} - ${responseText.substring(0, 100)}`);

      const success = response.ok && (
        responseText.includes('Message sent') ||
        responseText.includes('success') ||
        response.status === 200
      );

      if (!success) {
        console.error('CallMeBot API hatası:', responseText);
      }

      return success;
    } catch (error) {
      console.error('WhatsApp API hatası:', error);
      return false;
    }
  }

  /**
   * Mesaj durumunu güncelle
   */
  private async updateMessageStatus(id: number, status: 'bekliyor' | 'gonderildi' | 'hata', hata_mesaji?: string): Promise<void> {
    if (!this.supabase) await this.initialize();

    // Supabase bağlantısı yoksa güncelleme yapma
    if (!this.supabase) {
      console.warn('Supabase bağlantısı yok, mesaj durumu güncellenemedi (simülasyon)');
      return;
    }

    const updateData: any = {
      durum: status,
      gonderim_tarihi: status === 'gonderildi' ? new Date().toISOString() : null
    };

    if (hata_mesaji) {
      updateData.hata_mesaji = hata_mesaji;
    }

    const { error } = await this.supabase
      .from('whatsapp_loglari')
      .update(updateData)
      .eq('id', id);

    if (error) {
      console.error('Mesaj durumu güncelleme hatası:', error);
    }
  }

  /**
   * Ayarlardaki telefon numaralarını al
   */
  async getWhatsAppNumbers(): Promise<string[]> {
    if (!this.supabase) await this.initialize();

    // Supabase bağlantısı yoksa simülasyon numarası döndür
    if (!this.supabase) {
      console.warn('Supabase bağlantısı yok, simülasyon numarası döndürülüyor');
      return ['905551234567']; // simülasyon numarası
    }

    const { data: settings, error } = await this.supabase
      .from('ayarlar')
      .select('key, value')
      .in('key', ['whatsapp_telefon', 'whatsapp_telefon_1', 'whatsapp_telefon_2', 'whatsapp_telefon_3']);

    if (error) {
      console.error('Telefon numaraları alınırken hata:', error);
      // Hata durumunda simülasyon numarası döndür
      return ['905551234567'];
    }

    // Öncelik sırası: whatsapp_telefon_1, whatsapp_telefon_2, whatsapp_telefon_3, whatsapp_telefon (geriye uyumluluk)
    const priority = ['whatsapp_telefon_1', 'whatsapp_telefon_2', 'whatsapp_telefon_3', 'whatsapp_telefon'];
    const map = new Map<string, string>();
    (settings as { key: string; value: string }[]).forEach((s) => {
      if (s.value && s.value.trim() !== '') {
        map.set(s.key, s.value.trim());
      }
    });

    const numbers: string[] = [];
    for (const key of priority) {
      if (map.has(key)) {
        numbers.push(map.get(key)!);
      }
    }

    // Eğer hiç numara yoksa, simülasyon numarası döndür
    if (numbers.length === 0) {
      console.warn('WhatsApp telefon numarası bulunamadı, simülasyon numarası kullanılıyor');
      return ['905551234567'];
    }

    return numbers;
  }

  /**
   * WhatsApp aktif mi kontrol et
   */
  async isWhatsAppActive(): Promise<boolean> {
    if (!this.supabase) await this.initialize();

    // Supabase bağlantısı yoksa varsayılan olarak false döndür
    if (!this.supabase) {
      console.warn('Supabase bağlantısı yok, WhatsApp aktif değil (simülasyon)');
      return false;
    }

    try {
      const { data: setting, error } = await this.supabase
        .from('ayarlar')
        .select('value')
        .eq('key', 'whatsapp_aktif')
        .single();

      if (error || !setting) {
        console.warn('WhatsApp aktif ayarı bulunamadı, varsayılan: false', error?.message);
        return false;
      }

      const isActive = setting.value === 'true';
      console.log(`WhatsApp aktif durumu: ${isActive} (veritabanından alındı)`);
      return isActive;
    } catch (error: any) {
      console.error('WhatsApp aktif kontrol hatası:', error);
      return false;
    }
  }

  /**
   * Ödeme hatırlatma gününü al
   */
  async getReminderDays(): Promise<number> {
    if (!this.supabase) await this.initialize();

    const { data: setting, error } = await this.supabase
      .from('ayarlar')
      .select('value')
      .eq('key', 'whatsapp_odeme_hatirlatma_gun')
      .single();

    if (error || !setting) {
      return 2; // Varsayılan 2 gün
    }

    const days = parseInt(setting.value, 10);
    return isNaN(days) ? 2 : days;
  }

  /**
   * WhatsApp mesaj şablonunu al
   */
  async getWhatsAppMessageTemplate(): Promise<string> {
    if (!this.supabase) await this.initialize();

    const defaultMessage = `Merhaba,

{evrak_tipi} bilgileri:
Evrak No: {evrak_no}
Tutar: {tutar} {para_birimi}
Vade Tarihi: {vade_tarihi}

Bilgilerinize sunarız.`;

    if (!this.supabase) {
      return defaultMessage;
    }

    const { data: setting, error } = await this.supabase
      .from('ayarlar')
      .select('value')
      .eq('key', 'whatsapp_mesaj')
      .single();

    if (error || !setting) {
      return defaultMessage;
    }

    return setting.value || defaultMessage;
  }
  /**
   * WhatsApp Web'i yeni sekmede aç
   * VB6 mantığına uygun client-side yönlendirme
   */
  openWhatsAppWeb(telefon: string, mesaj: string): void {
    if (!telefon) {
      console.warn('WhatsApp için telefon numarası belirtilmedi');
      return;
    }

    // Telefon numarasını temizle (Sadece rakamlar)
    let cleanPhone = telefon.replace(/\D/g, '');

    // Eğer 90 ile başlamıyorsa ve 10 haneli ise başına 90 ekle
    if (cleanPhone.length === 10) {
      cleanPhone = '90' + cleanPhone;
    } else if (cleanPhone.length === 11 && cleanPhone.startsWith('0')) {
      cleanPhone = '90' + cleanPhone.substring(1);
    }

    // URL oluştur
    const encodedMessage = encodeURIComponent(mesaj);
    const url = `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMessage}`;

    // Yeni sekmede aç
    window.open(url, '_blank');
  }
}

// Singleton instance
export const whatsappService = new WhatsAppService();