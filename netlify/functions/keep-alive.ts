// ============================================
// CekSenet Web - Netlify Scheduled Function
// Keep-Alive: Supabase free tier'in 7 gun
// inaktivite sonrasi pause olmasini engeller
// Schedule: Her 6 saatte bir (netlify.toml'da tanimli)
// ============================================

import type { Config, Context } from "@netlify/functions"

export default async (req: Request, context: Context) => {
  console.log("Keep-alive function calisiyor:", new Date().toISOString())

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Keep-alive: Supabase credentials eksik")
      return new Response(
        JSON.stringify({ status: "error", message: "Configuration error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      )
    }

    // Supabase'e basit bir sorgu at
    const response = await fetch(`${supabaseUrl}/rest/v1/bankalar?select=count`, {
      method: "GET",
      headers: {
        apikey: supabaseServiceKey,
        Authorization: `Bearer ${supabaseServiceKey}`,
        "Content-Type": "application/json",
        Prefer: "count=exact",
      },
    })

    if (!response.ok) {
      const error = await response.text()
      console.error("Keep-alive: Database error", error)
      return new Response(
        JSON.stringify({
          status: "error",
          message: error,
          timestamp: new Date().toISOString(),
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      )
    }

    const count = response.headers.get("content-range")?.split("/")[1] || "?"
    console.log(`Keep-alive: Basarili - ${count} bankalar`)

    return new Response(
      JSON.stringify({
        status: "ok",
        message: "Database is alive",
        bankalar_count: count,
        timestamp: new Date().toISOString(),
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    )
  } catch (error) {
    console.error("Keep-alive: Unexpected error", error)
    return new Response(
      JSON.stringify({
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
}

// Netlify Scheduled Function config
export const config: Config = {
  schedule: "0 */6 * * *", // Her 6 saatte bir
}
