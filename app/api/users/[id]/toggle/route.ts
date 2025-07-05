import { NextResponse } from "next/server"
import { WhatsAppService } from "@/lib/whatsapp-service"

// POST - Toggle user active status
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        const service = WhatsAppService.getInstance()
        const user = service.toggleUserStatus(id)

        if (!user) {
            return NextResponse.json(
                {
                    success: false,
                    error: "User not found",
                },
                { status: 404 },
            )
        }

        return NextResponse.json({
            success: true,
            data: user,
        })
    } catch (error) {
        console.error("Failed to toggle user status:", error)
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 },
        )
    }
}
