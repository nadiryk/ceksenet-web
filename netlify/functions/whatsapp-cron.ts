// ============================================
// CekSenet Web - WhatsApp Cron Function
// Netlify Scheduled Function
// Schedule: Her gün saat 09:00'da (yerel saat) çalışır
// ============================================

export default async () => {
  console.log("WhatsApp cron function calisiyor:", new Date().toISOString())

  try {
    const apiUrl = process.env.URL || 'http://localhost:3000'
    const adminEmail = process.env.ADMIN_EMAIL
    const adminPassword = process.env.ADMIN_PASSWORD

    // Eğer development ortamındaysak ve admin bilgileri yoksa log yaz ve çık
    if (!adminEmail || !adminPassword) {
      console.warn("WhatsApp cron: Admin bilgileri eksik, simulation modunda calisiyor")
      
      // Simülasyon: Bekleyen mesajları işle (sadece log)
      console.log("WhatsApp cron: Simulasyon modunda - gercek gönderim yapilmadi")
      return new Response(
        JSON.stringify({
          status: "simulation",
          message: "Admin credentials eksik, sadece log islendi",
          timestamp: new Date().toISOString(),
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    }

    // Admin olarak login ol ve token al (Next.js auth cookie kullanmak daha kompleks)
    // Bunun yerine doğrudan API'yi çağıralım (API key ile korunabilir)
    // Basitçe API endpoint'ini çağıralım
    const cronSecret = process.env.CRON_SECRET
    const baseUrl = apiUrl.startsWith('http') ? apiUrl : `https://${apiUrl}`
    
    const url = `${baseUrl}/api/cron/whatsapp?process_pending=true&send_reminders=true`
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    
    // Eğer CRON_SECRET varsa authorization header'a ekle
    if (cronSecret) {
      headers['Authorization'] = `Bearer ${cronSecret}`
    }

    console.log(`WhatsApp cron: ${url} adresine istek gonderiliyor`)

    const response = await fetch(url, {
      method: 'GET',
      headers,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("WhatsApp cron: API hatasi", errorText)
      return new Response(
        JSON.stringify({
          status: "error",
          message: errorText,
          timestamp: new Date().toISOString(),
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      )
    }

    const result = await response.json()
    console.log("WhatsApp cron: Basarili", result)

    return new Response(
      JSON.stringify({
        status: "success",
        data: result,
        timestamp: new Date().toISOString(),
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    )

  } catch (error: any) {
    console.error("WhatsApp cron: Beklenmeyen hata", error)
    return new Response(
      JSON.stringify({
        status: "error",
        message: error.message,
        timestamp: new Date().toISOString(),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
}