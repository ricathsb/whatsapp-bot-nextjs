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

    console.log("[API] ===== CSV UPLOAD STARTED =====")

    // Load contacts for messaging (akan terakumulasi, tidak di-clear)
    const newContactsCount = await service.loadContacts(text)

    // Also load users for user management (sudah terakumulasi)
    const newUsersCount = await service.loadUsersFromCSV(text)

    // Get total counts after import
    const totalContactsCount = service.getContacts().length
    const totalUsersCount = service.getUsers().length

    console.log("[API] ===== CSV UPLOAD SUMMARY =====")
    console.log(`[API] New contacts added: ${newContactsCount}`)
    console.log(`[API] New users added: ${newUsersCount}`)
    console.log(`[API] Total contacts: ${totalContactsCount}`)
    console.log(`[API] Total users: ${totalUsersCount}`)

    return NextResponse.json({
      success: true,
      contactsCount: newContactsCount, // Contacts baru yang ditambahkan
      usersCount: newUsersCount, // Users baru yang ditambahkan
      totalContactsCount, // Total contacts di sistem
      totalUsersCount, // Total users di sistem
      message: `Added ${newContactsCount} new contacts and ${newUsersCount} new users. Total: ${totalContactsCount} contacts, ${totalUsersCount} users`,
    })
  } catch (error) {
    console.error("Failed to upload CSV:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
