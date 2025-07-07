import { NextResponse } from "next/server"
import { WhatsAppService } from "@/lib/whatsapp-service"

export async function GET() {
  try {
    const service = WhatsAppService.getInstance()
    const chatHistory = service.getAllChatHistory()

    return NextResponse.json({
      success: true,
      chatHistory,
    })
  } catch (error) {
    console.error("Failed to get chat history:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      chatHistory: {},
    })
  }
}
