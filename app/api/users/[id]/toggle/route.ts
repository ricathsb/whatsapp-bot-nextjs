/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

// POST - Toggle user active status
export async function POST(
  request: Request,
  { params }: { params: { id: string } } // ← Perbaikan: tidak perlu Promise
) {
  try {
    const { id } = params

    // 🔍 Cek apakah nasabah ada
    const existing = await prisma.nasabah.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          error: "User not found in database",
        },
        { status: 404 }
      )
    }

    const newStatus = !existing.isActive

    // 💾 Update kolom isActive
    const updated = await prisma.nasabah.update({
      where: { id },
      data: { isActive: newStatus },
    })

    // 🔁 Reload cache (in-memory user)
    const service = global.whatsappService
    const reloaded = await service?.getUserManager()?.loadUsersFromDatabase?.()

    return NextResponse.json({
      success: true,
      data: {
        id,
        name: updated.nama,
        phone: updated.no_hp,
        isActive: updated.isActive,
        reloaded,
      },
    })
  } catch (error: any) {
    console.error("Failed to toggle isActive:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
