import { NextResponse } from "next/server"
import { WhatsAppService } from "@/lib/whatsapp-service"

export async function POST(request: Request) {
    try {
        const client = WhatsAppService.getInstance()

        if (!client) {
            return NextResponse.json(
                { success: false, error: "Client not initialized" },
                { status: 500 }
            )
        }

        const body = await request.json().catch(() => ({}))
        const action = body?.action || "manual"

        if (action === "start") {
            client["startReloadInterval"]?.()
            return NextResponse.json({
                success: true,
                message: "🔁 Auto-reload started",
            })
        }

        if (action === "stop") {
            client["stopReloadInterval"]?.()
            return NextResponse.json({
                success: true,
                message: "🛑 Auto-reload stopped",
            })
        }

        // Default: manual reload
        await client.reloadUsers()
        return NextResponse.json({
            success: true,
            message: "✅ Users reloaded manually",
        })
    } catch (error) {
        console.error("[API] Failed to reload users:", error)
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 }
        )
    }
}
