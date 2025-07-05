import { NextResponse } from "next/server"
import { WhatsAppService } from "@/lib/whatsapp-service"

// GET - Get all users
export async function GET() {
    try {
        const service = WhatsAppService.getInstance()
        const users = service.getUsers()

        return NextResponse.json({
            success: true,
            data: users,
        })
    } catch (error) {
        console.error("Failed to get users:", error)
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 },
        )
    }
}

// POST - Add new user
export async function POST(request: Request) {
    try {
        const { name, phone } = await request.json()

        if (!name || !phone) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Name and phone are required",
                },
                { status: 400 },
            )
        }

        // Validate phone number
        const normalizedPhone = phone.replace(/\D/g, "")
        if (normalizedPhone.length < 10) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Invalid phone number",
                },
                { status: 400 },
            )
        }

        const service = WhatsAppService.getInstance()
        const user = service.addUser(name, phone)

        return NextResponse.json({
            success: true,
            data: user,
        })
    } catch (error) {
        console.error("Failed to add user:", error)
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 },
        )
    }
}
