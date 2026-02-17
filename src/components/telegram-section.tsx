'use client'

import { useState, useEffect } from 'react'
import { Subheading } from '@/components/ui/heading'
import { Text } from '@/components/ui/text'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Divider } from '@/components/ui/divider'
import { Field, FieldGroup, Label, Description, ErrorMessage } from '@/components/ui/fieldset'
import { CheckCircleIcon, ExclamationTriangleIcon, PaperAirplaneIcon } from '@heroicons/react/20/solid'

interface TelegramFormData {
  telegram_bot_token: string
  telegram_chat_id: string
  telegram_mesaj_sablonu: string
  telegram_aktif: boolean
}

const DEFAULT_TELEGRAM_TEMPLATE = `📋 *{evrak_tipi} Bilgisi*

*Evrak No:* {evrak_no}
*Tutar:* {tutar}
*Para Birimi:* {para_birimi}
*Vade:* {vade_tarihi}
*Durum:* {durum}
*Cari:* {cari}
*Banka:* {banka}
*Keşideci:* {kesideci}

[Detayları görüntüle]({evrak_url})`

const TELEGRAM_VARIABLES = [
  { key: '{evrak_tipi}', label: 'Evrak Tipi', example: 'Çek' },
  { key: '{evrak_no}', label: 'Evrak No', example: 'ABC123' },
  { key: '{tutar}', label: 'Tutar', example: '₺10.000,00' },
  { key: '{para_birimi}', label: 'Para Birimi', example: 'TRY' },
  { key: '{vade_tarihi}', label: 'Vade Tarihi', example: '15.02.2026' },
  { key: '{durum}', label: 'Durum', example: 'Portföy' },
  { key: '{cari}', label: 'Cari', example: 'Ahmet Yılmaz' },
  { key: '{banka}', label: 'Banka', example: 'Ziraat Bankası' },
  { key: '{kesideci}', label: 'Keşideci', example: 'Mehmet Demir' },
  { key: '{evrak_url}', label: 'Evrak URL', example: 'https://...' },
]

export default function TelegramSection() {
  const [formData, setFormData] = useState<TelegramFormData>({
    telegram_bot_token: '',
    telegram_chat_id: '',
    telegram_mesaj_sablonu: DEFAULT_TELEGRAM_TEMPLATE,
    telegram_aktif: false,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load settings on mount
  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/settings')
      const result = await response.json()

      if (response.ok && result.data) {
        setFormData({
          telegram_bot_token: result.data.telegram_bot_token || '',
          telegram_chat_id: result.data.telegram_chat_id || '',
          telegram_mesaj_sablonu: result.data.telegram_mesaj_sablonu || DEFAULT_TELEGRAM_TEMPLATE,
          telegram_aktif: result.data.telegram_aktif === 'true',
        })
      }
    } catch (err) {
      console.error('Telegram ayarları yüklenemedi:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)
      setSuccess(false)

      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegram_bot_token: formData.telegram_bot_token.trim(),
          telegram_chat_id: formData.telegram_chat_id.trim(),
          telegram_mesaj_sablonu: formData.telegram_mesaj_sablonu.trim(),
          telegram_aktif: String(formData.telegram_aktif),
        }),
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Telegram ayarları kaydedilemedi')
      }

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      console.error('Telegram ayarları kaydedilemedi:', err)
      setError(err.message || 'Ayarlar kaydedilirken bir hata oluştu.')
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    if (!formData.telegram_bot_token || !formData.telegram_chat_id) {
      setError('Test için Bot Token ve Chat ID gereklidir.')
      return
    }

    try {
      setSaving(true)
      setError(null)
      setSuccess(false)

      const response = await fetch('/api/telegram/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: formData.telegram_chat_id,
          customMessage: '✅ *Telegram Bot Test Mesajı*\\n\\nBu mesaj, ÇekSenet Web uygulamasından test amaçlı gönderilmiştir.\\n\\nTarih: ' + new Date().toLocaleString('tr-TR'),
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Test mesajı gönderilemedi.')
      }

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      console.error('Test hatası:', err)
      setError(err.message || 'Test başarısız oldu.')
    } finally {
      setSaving(false)
    }
  }

  const handleVariableClick = (variable: string) => {
    const textarea = document.getElementById('telegram-message') as HTMLTextAreaElement
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = formData.telegram_mesaj_sablonu

    const newText = text.substring(0, start) + variable + text.substring(end)
    setFormData((prev) => ({ ...prev, telegram_mesaj_sablonu: newText }))

    // Set cursor position after the inserted variable
    setTimeout(() => {
      textarea.focus()
      const newPos = start + variable.length
      textarea.setSelectionRange(newPos, newPos)
    }, 0)
  }

  const handleReset = () => {
    setFormData((prev) => ({ ...prev, telegram_mesaj_sablonu: DEFAULT_TELEGRAM_TEMPLATE }))
  }

  if (loading) {
    return (
      <section>
        <div className="flex items-center gap-3 mb-6">
          <PaperAirplaneIcon className="h-6 w-6 text-purple-600" />
          <Subheading>Telegram Ayarları</Subheading>
        </div>
        <div className="animate-pulse space-y-4 max-w-2xl">
          <div className="h-10 bg-zinc-100 rounded-lg" />
          <div className="h-32 bg-zinc-100 rounded-lg" />
        </div>
      </section>
    )
  }

  return (
    <section>
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-2">
        <PaperAirplaneIcon className="h-6 w-6 text-purple-600" />
        <Subheading>Telegram Ayarları</Subheading>
      </div>
      <Text className="mb-6">
        Evrak detay sayfasından Telegram'a mesaj göndermek için ayarları yapılandırın.
      </Text>

      {/* Alerts */}
      {success && (
        <div className="mb-6 max-w-2xl flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
          <CheckCircleIcon className="h-5 w-5 text-green-600 shrink-0" />
          <div>
            <Text className="font-medium text-green-800">Başarılı</Text>
            <Text className="text-sm text-green-700">İşlem tamamlandı.</Text>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 max-w-2xl flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-600 shrink-0" />
          <div>
            <Text className="font-medium text-red-800">Hata</Text>
            <Text className="text-sm text-red-700">{error}</Text>
          </div>
        </div>
      )}

      {/* Form */}
      <div className="max-w-2xl space-y-6">
        <FieldGroup>
          {/* Bot Token */}
          <Field>
            <Label>Bot Token</Label>
            <Description>
              BotFather'dan aldığınız Telegram bot token'ı.
            </Description>
            <Input
              type="password"
              placeholder="1234567890:ABCDEFGHIJKLMNOPQRSTUVWXYZ"
              value={formData.telegram_bot_token}
              onChange={(e) => setFormData((prev) => ({ ...prev, telegram_bot_token: e.target.value }))}
            />
          </Field>

          {/* Chat ID */}
          <Field>
            <Label>Chat ID</Label>
            <Description>
              Mesajların gönderileceği Telegram sohbet ID'si.
            </Description>
            <Input
              placeholder="123456789"
              value={formData.telegram_chat_id}
              onChange={(e) => setFormData((prev) => ({ ...prev, telegram_chat_id: e.target.value }))}
            />
          </Field>

          {/* Message Template */}
          <Field>
            <Label>Mesaj Şablonu (Markdown)</Label>
            <Description>
              Telegram mesaj şablonu. Markdown formatı desteklenir.
            </Description>
            <Textarea
              id="telegram-message"
              rows={10}
              value={formData.telegram_mesaj_sablonu}
              onChange={(e) => setFormData((prev) => ({ ...prev, telegram_mesaj_sablonu: e.target.value }))}
            />
          </Field>
        </FieldGroup>

        {/* Variable Helper */}
        <div>
          <Text className="text-sm font-medium text-zinc-700 mb-2">
            Kullanılabilir Değişkenler
          </Text>
          <Text className="text-xs text-zinc-500 mb-3">
            Değişkene tıklayarak mesaj şablonuna ekleyebilirsiniz.
          </Text>
          <div className="flex flex-wrap gap-2">
            {TELEGRAM_VARIABLES.map((v) => (
              <button
                key={v.key}
                type="button"
                onClick={() => handleVariableClick(v.key)}
                className="inline-flex items-center gap-1.5 rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-200 transition-colors cursor-pointer"
                title={`Örnek: ${v.example}`}
              >
                <code className="text-blue-600">{v.key}</code>
                <span className="text-zinc-500">- {v.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Active Toggle */}
        <div className="flex items-start gap-3">
          <div className="flex h-6 items-center">
            <input
              id="telegram_aktif"
              name="telegram_aktif"
              type="checkbox"
              checked={formData.telegram_aktif}
              onChange={(e) => setFormData((prev) => ({ ...prev, telegram_aktif: e.target.checked }))}
              className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-600"
            />
          </div>
          <div className="text-sm leading-6">
            <label htmlFor="telegram_aktif" className="font-medium text-zinc-900">
              Telegram Bildirimlerini Aç
            </label>
            <p className="text-zinc-500">
              Aktif edildiğinde evrak detay sayfasında Telegram butonu görünür olur.
            </p>
          </div>
        </div>

        <Divider />

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button color="purple" onClick={handleSave} disabled={saving}>
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
          <Button outline onClick={handleTest} disabled={saving || !formData.telegram_bot_token || !formData.telegram_chat_id}>
            Test Mesajı Gönder
          </Button>
          <Button outline onClick={handleReset} disabled={saving}>
            Şablonu Sıfırla
          </Button>
        </div>

        {/* Info Note */}
        {(!formData.telegram_bot_token || !formData.telegram_chat_id) && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
            <div className="flex gap-3">
              <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <Text className="font-medium text-amber-800">Ayarlar eksik</Text>
                <Text className="text-sm text-amber-700 mt-1">
                  Telegram butonunun çalışması için Bot Token ve Chat ID girmeniz gerekiyor.
                </Text>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}