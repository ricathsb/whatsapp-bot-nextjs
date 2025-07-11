/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server"
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

    // 🔁 Reload in-memory users
    const service = global.whatsappService
    const reloaded = await service?.getUserManager()?.loadUsersFromDatabase?.()

    return NextResponse.json({
      success: true,
      data: {
        id,
        name: updatedNasabah.nama,
        phone: updatedNasabah.no_hp,
        reloaded,
      },
    })
  } catch (error: any) {
    if (error.code === "P2025") {
      return NextResponse.json(
        { success: false, error: "User not found in database" },
        { status: 404 }
      )
    }

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

    // 💾 Hapus dari database
    const dbDeleted = await prisma.nasabah.delete({
      where: { id },
    })

    // 🔁 Reload in-memory users
    const service = global.whatsappService
    const reloaded = await service?.getUserManager()?.loadUsersFromDatabase?.()

    return NextResponse.json({
      success: true,
      data: {
        deletedFromDB: true,
        reloaded,
        deletedUser: dbDeleted,
      },
    })
  } catch (error: any) {
    if (error.code === "P2025") {
      return NextResponse.json(
        { success: false, error: "User not found in database" },
        { status: 404 }
      )
    }

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
