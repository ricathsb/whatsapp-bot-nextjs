import { NextResponse } from "next/server"
import { WhatsAppService } from "@/lib/whatsapp-service"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

// PUT - Update user
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, phone } = body

    if (!name && !phone) {
      return NextResponse.json(
        { success: false, error: "No data provided" },
        { status: 400 }
      )
    }

    const updates: { nama?: string; no_hp?: string } = {}
    if (name) updates.nama = name
    if (phone) updates.no_hp = phone.replace(/\D/g, "")

    // 💾 Update database
    const updatedNasabah = await prisma.nasabah.update({
      where: { id },
      data: updates,
    })

    // 🧠 Update in-memory user
    const service = WhatsAppService.getInstance()
    const updatedUser = service.updateUser(id, {
      name: updatedNasabah.nama,
      phone: updatedNasabah.no_hp,
    })

    if (!updatedUser) {
      return NextResponse.json(
        { success: false, error: "User not found in memory" },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: updatedUser })
  } catch (error) {
    console.error("Failed to update user:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

// DELETE - Delete user
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // 💾 Delete from database
    await prisma.nasabah.delete({ where: { id } })

    // 🧠 Delete from memory
    const service = WhatsAppService.getInstance()
    const success = service.deleteUser(id)

    if (!success) {
      return NextResponse.json(
        { success: false, error: "User not found in memory" },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete user:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
