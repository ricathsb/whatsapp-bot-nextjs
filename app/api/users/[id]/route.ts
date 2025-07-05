/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server"
import { WhatsAppService } from "@/lib/whatsapp-service"

// PUT - Update user
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        const { name, phone } = await request.json()
        const service = WhatsAppService.getInstance()

        const updates: any = {}
        if (name) updates.name = name
        if (phone) updates.phone = phone.replace(/\D/g, "")

        const user = service.updateUser(id, updates)

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
        console.error("Failed to update user:", error)
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 },
        )
    }
}

// DELETE - Delete user
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        const service = WhatsAppService.getInstance()
        const success = service.deleteUser(id)

        if (!success) {
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
        })
    } catch (error) {
        console.error("Failed to delete user:", error)
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 },
        )
    }
}
