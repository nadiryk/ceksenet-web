import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { phone, message } = body

        // Şu an için server-side WhatsApp gönderimi aktif değil
        // Client-side openWhatsAppWeb kullanılıyor

        return NextResponse.json({
            success: true,
            message: 'WhatsApp API route ready (simulation mode)',
            data: { phone, message }
        })
    } catch (error) {
        return NextResponse.json(
            { success: false, error: 'Invalid request' },
            { status: 400 }
        )
    }
}
