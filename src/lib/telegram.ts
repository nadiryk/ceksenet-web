// Telegram Bot Service
// node-telegram-bot-api kullanarak mesaj gönderimi

import TelegramBot from 'node-telegram-bot-api';
import { createClient } from './supabase/server';

export interface TelegramMessageOptions {
  chatId?: string;
  parseMode?: 'Markdown' | 'HTML' | 'MarkdownV2';
  disableWebPagePreview?: boolean;
  disableNotification?: boolean;
}

export interface TelegramSendResult {
  success: boolean;
  message?: string;
  error?: string;
  messageId?: number;
}

class TelegramService {
  private static instance: TelegramService;
  private bot: TelegramBot | null = null;
  private token: string | null = null;
  private defaultChatId: string | null = null;
  private isInitialized = false;

  private constructor() {}

  static getInstance(): TelegramService {
    if (!TelegramService.instance) {
      TelegramService.instance = new TelegramService();
    }
    return TelegramService.instance;
  }

  /**
   * Ayarlardan token ve chat ID'yi yükler
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const supabase = await createClient();
      const { data } = await supabase
        .from('ayarlar')
        .select('key, value')
        .in('key', ['telegram_bot_token', 'telegram_chat_id', 'telegram_aktif']);

      const settings: Record<string, string> = {};
      data?.forEach((row) => {
        settings[row.key] = row.value || '';
      });

      this.token = settings.telegram_bot_token || '';
      this.defaultChatId = settings.telegram_chat_id || '';

      const isActive = settings.telegram_aktif === 'true';

      if (!isActive || !this.token || !this.defaultChatId) {
        console.warn('Telegram ayarları eksik veya aktif değil.');
        this.isInitialized = false;
        return;
      }

      // Bot örneği oluştur (polling kullanmadan sadece API)
      this.bot = new TelegramBot(this.token, { polling: false });
      this.isInitialized = true;

      console.log('Telegram servisi başlatıldı.');
    } catch (error) {
      console.error('Telegram servisi başlatılamadı:', error);
      this.isInitialized = false;
    }
  }

  /**
   * Tek bir mesaj gönderir
   */
  async sendMessage(
    text: string,
    options?: TelegramMessageOptions
  ): Promise<TelegramSendResult> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (!this.bot || !this.token) {
        return {
          success: false,
          error: 'Telegram bot başlatılamadı. Token veya chat ID eksik.',
        };
      }

      const chatId = options?.chatId || this.defaultChatId;
      if (!chatId) {
        return {
          success: false,
          error: 'Chat ID belirtilmedi.',
        };
      }

      const message = await this.bot.sendMessage(chatId, text, {
        parse_mode: options?.parseMode || 'Markdown',
        disable_web_page_preview: options?.disableWebPagePreview || false,
        disable_notification: options?.disableNotification || false,
      });

      // Log kaydı oluştur (opsiyonel)
      await this.logMessage(chatId, text, 'gonderildi', message.message_id);

      return {
        success: true,
        message: 'Mesaj başarıyla gönderildi.',
        messageId: message.message_id,
      };
    } catch (error: any) {
      const errorMsg = error?.message || 'Bilinmeyen hata';
      console.error('Telegram mesaj gönderimi hatası:', error);

      // Hata logu
      await this.logMessage(
        options?.chatId || this.defaultChatId || '',
        text,
        'hata',
        undefined,
        errorMsg
      );

      return {
        success: false,
        error: errorMsg,
      };
    }
  }

  /**
   * Evrak bilgilerini kullanarak formatlı mesaj oluşturur
   */
  async sendEvrakMessage(evrak: any): Promise<TelegramSendResult> {
    try {
      const supabase = await createClient();
      const { data } = await supabase
        .from('ayarlar')
        .select('key, value')
        .eq('key', 'telegram_mesaj_sablonu')
        .single();

      let template = data?.value || '';
      if (!template) {
        template = `📋 *{evrak_tipi} Bilgisi*

*Evrak No:* {evrak_no}
*Tutar:* {tutar}
*Para Birimi:* {para_birimi}
*Vade:* {vade_tarihi}
*Durum:* {durum}
*Cari:* {cari}
*Banka:* {banka}
*Keşideci:* {kesideci}

[Detayları görüntüle]({evrak_url})`;
      }

      const formatCurrency = (amount: number, currency: string): string => {
        return new Intl.NumberFormat('tr-TR', {
          style: 'currency',
          currency: currency || 'TRY',
        }).format(amount);
      };

      const formatDate = (dateString: string): string => {
        const date = new Date(dateString);
        return date.toLocaleDateString('tr-TR');
      };

      const evrakTipiLabel = evrak.evrak_tipi === 'cek' ? 'Çek' : 'Senet';
      const tutarFormatted = formatCurrency(evrak.tutar, evrak.para_birimi || 'TRY');
      const vadeFormatted = formatDate(evrak.vade_tarihi);
      const cariAd = evrak.cari?.ad_soyad || '-';
      const bankaAd = evrak.banka?.ad || '-';
      const kesideci = evrak.kesideci || '-';
      const durumLabel = evrak.durum === 'portfoy' ? 'Portföy' :
                        evrak.durum === 'bankada' ? 'Bankada' :
                        evrak.durum === 'ciro' ? 'Ciro Edildi' :
                        evrak.durum === 'tahsil' ? 'Tahsil Edildi' :
                        evrak.durum === 'karsiliksiz' ? 'Karşılıksız' : evrak.durum;

      // Uygulama URL'si (ortam değişkeninden)
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const evrakUrl = `${baseUrl}/evraklar/${evrak.id}`;

      const replacements: Record<string, string> = {
        '{evrak_tipi}': evrakTipiLabel,
        '{evrak_no}': evrak.evrak_no,
        '{tutar}': tutarFormatted,
        '{para_birimi}': evrak.para_birimi || 'TRY',
        '{vade_tarihi}': vadeFormatted,
        '{durum}': durumLabel,
        '{cari}': cariAd,
        '{banka}': bankaAd,
        '{kesideci}': kesideci,
        '{evrak_url}': evrakUrl,
      };

      let message = template;
      Object.entries(replacements).forEach(([key, value]) => {
        message = message.split(key).join(value);
      });

      return await this.sendMessage(message, { parseMode: 'Markdown' });
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || 'Mesaj şablonu işlenirken hata oluştu.',
      };
    }
  }

  /**
   * Gönderim logu kaydeder
   */
  private async logMessage(
    chatId: string,
    mesaj: string,
    durum: 'gonderildi' | 'hata' | 'bekliyor',
    messageId?: number,
    hataMesaji?: string
  ): Promise<void> {
    try {
      const supabase = await createClient();
      await supabase.from('telegram_loglari').insert({
        chat_id: chatId,
        mesaj: mesaj.substring(0, 1000), // Uzun mesajları kısalt
        durum,
        hata_mesaji: hataMesaji,
        evrak_id: undefined, // İlgili evrak ID'si sonradan eklenebilir
        gonderim_tarihi: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Telegram log kaydı hatası:', error);
    }
  }

  /**
   * Ayarları kontrol eder (token ve chat ID var mı?)
   */
  async checkSettings(): Promise<{
    hasToken: boolean;
    hasChatId: boolean;
    isActive: boolean;
  }> {
    try {
      const supabase = await createClient();
      const { data } = await supabase
        .from('ayarlar')
        .select('key, value')
        .in('key', ['telegram_bot_token', 'telegram_chat_id', 'telegram_aktif']);

      const settings: Record<string, string> = {};
      data?.forEach((row) => {
        settings[row.key] = row.value || '';
      });

      return {
        hasToken: !!settings.telegram_bot_token,
        hasChatId: !!settings.telegram_chat_id,
        isActive: settings.telegram_aktif === 'true',
      };
    } catch (error) {
      console.error('Ayarlar kontrol hatası:', error);
      return { hasToken: false, hasChatId: false, isActive: false };
    }
  }
}

export const telegramService = TelegramService.getInstance();