import { NextRequest, NextResponse } from "next/server"
import { WhatsAppService } from "@/lib/whatsapp-service"

export async function POST() {
  try {
    const service = WhatsAppService.getInstance()
    await service.start()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to start WhatsApp service:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
