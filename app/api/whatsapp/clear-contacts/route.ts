/* eslint-disable @typescript-eslint/no-explicit-any */
// ✅ TAMBAHAN: API endpoint untuk clear contacts jika diperlukan
import { NextResponse } from "next/server"
import { WhatsAppService } from "@/lib/whatsapp-service"

export async function POST() {
    try {
        const service = WhatsAppService.getInstance()

        // Clear contacts
        const contactManager = (service as any).contactManager
        if (contactManager && typeof contactManager.clearContacts === "function") {
            contactManager.clearContacts()
        }

        return NextResponse.json({
            success: true,
            message: "All contacts cleared successfully",
        })
    } catch (error) {
        console.error("Failed to clear contacts:", error)
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        })
    }
}

