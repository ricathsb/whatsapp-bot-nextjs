import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()

    // Handle both old and new field names for backward compatibility
    const { nama, no_hp, nik, no_kpj, name, phone } = body

    // Use new field names (nama, no_hp) or fall back to old ones (name, phone)
    const nameValue = nama || name
    const phoneValue = no_hp || phone

    if (!nameValue && !phoneValue && !nik && !no_kpj) {
      return NextResponse.json({ success: false, error: "No data provided" }, { status: 400 })
    }

    const updates: {
      nama?: string
      no_hp?: string
      nik?: string
      no_kpj?: string
    } = {}

    if (nameValue) updates.nama = nameValue.trim()
    if (phoneValue) updates.no_hp = phoneValue.replace(/\D/g, "")
    if (nik !== undefined) updates.nik = nik.trim()
    if (no_kpj !== undefined) updates.no_kpj = no_kpj.trim()

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
        id: updatedNasabah.id,
        nama: updatedNasabah.nama,
        no_hp: updatedNasabah.no_hp,
        nik: updatedNasabah.nik,
        no_kpj: updatedNasabah.no_kpj,
        isActive: updatedNasabah.isActive,
        status_langganan: updatedNasabah.status_langganan,
        updatedAt: updatedNasabah.updatedAt,
        userId: updatedNasabah.userId,
        reloaded,
      },
    })
  } catch (error: any) {
    if (error.code === "P2025") {
      return NextResponse.json({ success: false, error: "User not found in database" }, { status: 404 })
    }
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
