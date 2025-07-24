import { type NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

// POST - Create new nasabah
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, phone } = body

    if (!name?.trim() || !phone?.trim()) {
      return NextResponse.json({ success: false, error: "Name and phone are required" }, { status: 400 })
    }

    // Check if nasabah with this phone already exists
    const existingNasabah = await prisma.nasabah.findFirst({
      where: { no_hp: phone.trim() },
    })

    if (existingNasabah) {
      return NextResponse.json({ success: false, error: "User with this phone number already exists" }, { status: 400 })
    }

    const nasabah = await prisma.nasabah.create({
      data: {
        nama: name.trim(), // Use nama field name
        no_hp: phone.trim(), // Use no_hp field name
      },
    })

    return NextResponse.json({ success: true, user: nasabah })
  } catch (error) {
    console.error("Failed to create nasabah:", error)
    return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 },
    )
  }
}

// GET - Fetch all nasabah
export async function GET() {
  try {
    const nasabah = await prisma.nasabah.findMany({
      select: {
        id: true,
        nama: true,
        no_hp: true,
        isSended: true,
      },
      orderBy: {
        id: "desc", // Since there's no createdAt field, order by id
      },
    })

    // Map to match frontend expectations
    const users = nasabah.map((n) => ({
      id: n.id,
      name: n.nama,
      phone: n.no_hp,
      isSended: n.isSended,
      createdAt: new Date().toISOString(), // Placeholder since no createdAt field
    }))

    return NextResponse.json({ success: true, users })
  } catch (error) {
    console.error("Failed to fetch nasabah:", error)
    return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 },
    )
  }
}
