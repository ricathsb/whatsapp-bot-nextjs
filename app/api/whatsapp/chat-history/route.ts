import { NextResponse } from "next/server"
import { WhatsAppService } from "@/lib/whatsapp-service"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const phone = searchParams.get('phone')
    
    const service = WhatsAppService.getInstance()
    
    let responseData;
    if (phone) {
      // Get specific chat history
      const chatHistory = service.getChatHistory(phone)
      responseData = { 
        success: true, 
        data: chatHistory,
        message: `Retrieved chat history for ${phone}`
      }
    } else {
      // Get all chat history
      const allChatHistory = service.getAllChatHistory()
      responseData = { 
        success: true, 
        data: allChatHistory,
        message: 'Retrieved all chat history'
      }
    }

    return NextResponse.json(responseData)
  } catch (error) {
    console.error("Failed to get chat history:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      data: null,
    }, { status: 500 })
  }
}