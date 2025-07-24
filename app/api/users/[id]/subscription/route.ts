import { prisma } from "@/lib/prisma"
import { type NextRequest, NextResponse } from "next/server"

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: nasabahId } = await context.params
    const { status_langganan } = await request.json()

    // ✅ Mapping dari input frontend ke format database
    const langgananMap = {
      berlangganan: "subscribe",
      subscribe: "subscribe",
      aktif: "subscribe",
      tidak: "unsubscribe",
      unsubscribe: "unsubscribe",
      nonaktif: "unsubscribe",
      invalid: "invalid",
    } as const

    const status_langganan_db = langgananMap[status_langganan as keyof typeof langgananMap]

    // ❌ Jika input tidak dikenal, tolak permintaan
    if (!status_langganan_db) {
      return NextResponse.json(
        { success: false, error: "Status langganan tidak valid" },
        { status: 400 }
      )
    }

    // ✅ Inisialisasi nilai default untuk status dan verifikasi
    let status = "pending"
    let isActive = false
    let verifiedAt: Date | null = null

    switch (status_langganan_db) {
      case "invalid":
        status = "verified"
        isActive = true
        verifiedAt = new Date()
        break

      case "unsubscribe":
        status = "verified"
        isActive = false
        verifiedAt = new Date()
        break

      case "subscribe":
        status = "pending"
        isActive = false
        verifiedAt = null
        break
    }

    // 🔄 Update data nasabah di database
    const updatedNasabah = await prisma.nasabah.update({
      where: { id: nasabahId },
      data: {
        status_langganan: status_langganan_db,
        status,
        isActive,
        verifiedAt,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      data: updatedNasabah,
      message: "Status langganan berhasil diperbarui",
    })
  } catch (error) {
    console.error("Gagal memperbarui status langganan:", error)
    return NextResponse.json(
      { success: false, error: "Terjadi kesalahan saat memperbarui status langganan" },
      { status: 500 }
    )
  }
}
