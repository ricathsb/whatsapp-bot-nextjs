import { NextResponse } from "next/server"
import { WhatsAppService } from "@/lib/whatsapp-service"

export async function POST() {
    try {
        const client = WhatsAppService.getInstance()

        if (!client) {
            return NextResponse.json({ success: false, error: "Client not initialized" }, { status: 500 })
        }

        await client.reloadUsers()

        return NextResponse.json({ success: true, message: "Users reloaded" })
    } catch (error) {
        console.error("[API] Failed to reload users:", error)
        return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
    }
}
