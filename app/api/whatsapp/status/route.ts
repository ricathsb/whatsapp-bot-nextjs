import { NextResponse } from "next/server"
import { WhatsAppService } from "@/lib/whatsapp-service"

export async function GET() {
  try {
    const service = WhatsAppService.getInstance()
    const status = service.getStatus()

    return NextResponse.json(status)
  } catch (error) {
    console.error("Failed to get WhatsApp status:", error)
    return NextResponse.json({
      isRunning: false,
      isReady: false,
      contactsCount: 0,
      messagesSent: 0,
      messagesReceived: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
