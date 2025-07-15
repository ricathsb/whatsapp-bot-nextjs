import { NextRequest, NextResponse } from "next/server"
import { WhatsAppService } from "@/lib/whatsapp-service"

export async function POST(request: NextRequest) {
  try {
    // Ambil token dari cookie
    const cookieHeader = request.headers.get("cookie")
    const token = cookieHeader
      ?.split(";")
      .find((c) => c.trim().startsWith("auth-token="))
      ?.split("=")[1]

    if (!token) {
      return NextResponse.json({ success: false, error: "Unauthorized: No token" }, { status: 401 })
    }

    const cleanToken = decodeURIComponent(token)

    const service = WhatsAppService.getInstance()
    await service.startWithToken(cleanToken)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to start WhatsApp service:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
