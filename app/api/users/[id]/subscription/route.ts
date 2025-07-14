import { prisma } from "@/lib/prisma"
import { type NextRequest, NextResponse } from "next/server"

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: nasabahId } = await context.params
    const { status_langganan } = await request.json()

    // Terima hanya versi bahasa Indonesia dari frontend
    if (!["berlangganan", "tidak", "invalid"].includes(status_langganan)) {
      return NextResponse.json(
        { success: false, error: "Status langganan tidak valid" },
        { status: 400 }
      )
    }

    // Konversi ke format database
    let status_langganan_db: "subscribe" | "unsubscribe" | "invalid" = "subscribe"
    let status = "pending"
    let isActive = false
    let verifiedAt: Date | null = null

    if (status_langganan === "invalid") {
      status_langganan_db = "invalid"
      status = "verified"
      isActive = true
      verifiedAt = new Date()
    } else if (status_langganan === "tidak") {
      status_langganan_db = "unsubscribe"
      status = "verified"
      isActive = false
      verifiedAt = new Date()
    } else if (status_langganan === "berlangganan") {
      status_langganan_db = "subscribe"
      status = "pending"
      isActive = false
    }

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
