// ✅ TAMBAHAN: API endpoint untuk clear users jika diperlukan
import { NextResponse } from "next/server"
import { WhatsAppService } from "@/lib/whatsapp-service"

export async function POST() {
    try {
        const service = WhatsAppService.getInstance()
        service.clearUsers()

        return NextResponse.json({
            success: true,
            message: "All users cleared successfully",
        })
    } catch (error) {
        console.error("Failed to clear users:", error)
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        })
    }
}
