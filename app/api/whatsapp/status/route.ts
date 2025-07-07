import { NextResponse } from "next/server"
import { WhatsAppService } from "@/lib/whatsapp-service"

export async function GET() {
  try {
    const service = WhatsAppService.getInstance()
    const status = service.getStatus()
    const users = service.getUsers() // ✅ Ambil users data

    return NextResponse.json({
      ...status,
      usersCount: users.length, // ✅ Tambahkan users count
    })
  } catch (error) {
    console.error("Status check error:", error)
    return NextResponse.json({
      isRunning: false,
      isReady: false,
      contactsCount: 0,
      usersCount: 0, // ✅ Tambahkan default value
      messagesSent: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
