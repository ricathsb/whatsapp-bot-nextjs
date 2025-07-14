import { prisma } from "@/lib/prisma"
import { type NextRequest, NextResponse } from "next/server"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { status_langganan } = await request.json()
    const nasabahId = params.id

    if (!["berlangganan", "tidak", "invalid"].includes(status_langganan)) {
      return NextResponse.json({ success: false, error: "Invalid subscription status" }, { status: 400 })
    }

    let status = "pending"
    let isActive = false
    let verifiedAt: Date | null = null

    // Logika status dan bot (isActive)
    if (status_langganan === "invalid") {
      status = "verified"
      isActive = true // hanya invalid yang bisa aktif
      verifiedAt = new Date()
    } else if (status_langganan === "tidak") {
      status = "verified"
      isActive = false
      verifiedAt = new Date()
    } else if (status_langganan === "berlangganan") {
      status = "pending"
      isActive = false
    }

    const updatedNasabah = await prisma.nasabah.update({
      where: { id: nasabahId },
      data: {
        status_langganan,
        status,
        isActive,
        verifiedAt,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      data: updatedNasabah,
      message: "Subscription status updated successfully",
    })
  } catch (error) {
    console.error("Error updating subscription status:", error)
    return NextResponse.json({ success: false, error: "Failed to update subscription status" }, { status: 500 })
  }
}
