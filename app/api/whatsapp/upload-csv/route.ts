import { type NextRequest, NextResponse } from "next/server"
import { WhatsAppService } from "@/lib/whatsapp-service"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("csv") as File

    if (!file) {
      return NextResponse.json({ success: false, error: "No file provided" })
    }

    const text = await file.text()
    const service = WhatsAppService.getInstance()

    // Load contacts for messaging
    const contactsCount = await service.loadContacts(text)

    // Also load users for user management
    const usersCount = await service.loadUsersFromCSV(text)

    return NextResponse.json({
      success: true,
      contactsCount,
      usersCount,
      message: `Loaded ${contactsCount} contacts and ${usersCount} users`,
    })
  } catch (error) {
    console.error("Failed to upload CSV:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
