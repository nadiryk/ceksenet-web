import { createClient } from '@/lib/supabase/server';

export interface WhatsAppMessage {
  telefon: string;
  mesaj: string;
  evrak_id?: number;
  kredi_taksit_id?: number;
}

export interface WhatsAppLog {
  id: number;
  telefon: string;
  mesaj: string;
  durum: 'bekliyor' | 'gonderildi' | 'hata';
  hata_mesaji?: string;
  evrak_id?: number;
  kredi_taksit_id?: number;
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
    this.supabase = await createClient();
  }

  /**
   * Bekleyen mesajları gönder
   */
  async processPendingMessages(): Promise<{ sent: number; failed: number }> {
    if (!this.supabase) await this.initialize();

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

    let sent = 0;
    let failed = 0;

    for (const msg of pendingMessages) {
      try {
        const success = await this.sendMessage(msg);
        
        if (success) {
          await this.updateMessageStatus(msg.id, 'gonderildi');
          sent++;
        } else {
          await this.updateMessageStatus(msg.id, 'hata', 'Gönderim başarısız');
          failed++;
        }
      } catch (error: any) {
        console.error(`Mesaj gönderim hatası (ID: ${msg.id}):`, error);
        await this.updateMessageStatus(msg.id, 'hata', error.message);
        failed++;
      }
    }

    return { sent, failed };
  }

  /**
   * Tekil mesaj gönder
   */
  async sendSingleMessage(message: WhatsAppMessage): Promise<boolean> {
    if (!this.supabase) await this.initialize();

    // Önce log kaydı oluştur
    const { data: log, error: insertError } = await this.supabase
      .from('whatsapp_loglari')
      .insert({
        telefon: message.telefon,
        mesaj: message.mesaj,
        evrak_id: message.evrak_id || null,
        kredi_taksit_id: message.kredi_taksit_id || null,
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
      const success = await this.sendMessage(log);
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
   * Bu fonksiyonu ihtiyacınıza göre özelleştirin
   */
  private async sendMessage(log: WhatsAppLog): Promise<boolean> {
    // TODO: Gerçek WhatsApp gönderim entegrasyonu buraya eklenmeli
    // Örnek entegrasyonlar:
    // 1. WhatsApp Web API (whatsapp-web.js)
    // 2. Twilio WhatsApp API
    // 3. CallMeBot gibi ücretsiz servisler
    // 4. Özel bir WhatsApp Business API

    console.log(`WhatsApp gönderiliyor: ${log.telefon} - ${log.mesaj.substring(0, 50)}...`);

    // Şimdilik simülasyon: %90 başarı oranı
    const simulatedSuccess = Math.random() > 0.1;

    if (!simulatedSuccess) {
      console.warn('Simüle edilmiş gönderim hatası');
      return false;
    }

    // Gerçek gönderim yapılacaksa aşağıdaki kodu açın ve düzenleyin:
    /*
    try {
      // Örnek: CallMeBot API
      const response = await fetch(`https://api.callmebot.com/whatsapp.php?phone=${log.telefon}&text=${encodeURIComponent(log.mesaj)}&apikey=YOUR_API_KEY`);
      return response.ok;
    } catch (error) {
      console.error('WhatsApp API hatası:', error);
      return false;
    }
    */

    return true;
  }

  /**
   * Mesaj durumunu güncelle
   */
  private async updateMessageStatus(id: number, status: 'bekliyor' | 'gonderildi' | 'hata', hata_mesaji?: string): Promise<void> {
    if (!this.supabase) await this.initialize();

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

    const { data: settings, error } = await this.supabase
      .from('ayarlar')
      .select('key, value')
      .in('key', ['whatsapp_telefon_1', 'whatsapp_telefon_2', 'whatsapp_telefon_3']);

    if (error) {
      console.error('Telefon numaraları alınırken hata:', error);
      return [];
    }

    const numbers = (settings as { key: string; value: string }[])
      .map((s: { key: string; value: string }) => s.value)
      .filter((v: string | null) => v && v.trim() !== '');

    return numbers as string[];
  }

  /**
   * WhatsApp aktif mi kontrol et
   */
  async isWhatsAppActive(): Promise<boolean> {
    if (!this.supabase) await this.initialize();

    const { data: setting, error } = await this.supabase
      .from('ayarlar')
      .select('value')
      .eq('key', 'whatsapp_aktif')
      .single();

    if (error || !setting) {
      return false;
    }

    return setting.value === 'true';
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
}

// Singleton instance
export const whatsappService = new WhatsAppService();