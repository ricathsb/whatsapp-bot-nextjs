// app/api/send/route.ts
import { NextResponse } from "next/server"
import { WhatsAppService } from "@/lib/whatsapp-service"

export async function POST(request: Request) {
  try {
    const { message } = await request.json()

    if (!message) {
      return NextResponse.json(
        { success: false, error: "No message provided" },
        { status: 400 }
      )
    }

    const service = WhatsAppService.getInstance()

    // ✅ Kirim ke user yang sudah ada di memori
    await service.sendBulkMessages(message)

    return NextResponse.json({
      success: true,
      sentCount: service.getStatus().messagesSent,
    })
  } catch (error) {
    console.error("Failed to send messages:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
