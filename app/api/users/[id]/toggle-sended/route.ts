import { type NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    if (!id) {
      return NextResponse.json({ success: false, error: "User ID is required" }, { status: 400 })
    }

    // Get the current user
    const nasabah = await prisma.nasabah.findUnique({
      where: { id },
    })

    if (!nasabah) {
      return NextResponse.json({ success: false, error: "nasabah not found" }, { status: 404 })
    }

    // Toggle the isSended status
    const updatedUser = await prisma.nasabah.update({
      where: { id },
      data: {
        isSended: !nasabah.isSended,
        updatedAt: new Date(),
      },
    })

    // Optional: Emit event for bulk update listeners
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("bulkUserUpdate"))
    }

    return NextResponse.json({
      success: true,
      data: updatedUser,
      message: `User ${updatedUser.isSended ? "marked as sent" : "unmarked as sent"}`,
    })
  } catch (error) {
    console.error("Error toggling user sended status:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
