import { NextResponse } from "next/server"
import { WhatsAppService } from "../../../../lib/whatsapp-service"

export async function POST() {
  try {
    const service = WhatsAppService.getInstance()
    await service.stop()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to stop WhatsApp service:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
