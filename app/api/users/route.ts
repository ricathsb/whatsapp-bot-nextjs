import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import jwt from "jsonwebtoken"
import crypto from "crypto"

const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET!

// 🔹 POST - Create or update nasabah
export async function POST(request: NextRequest) {
  try {
    // Ambil token dari cookie
    const cookieHeader = request.headers.get("cookie")
    const token = cookieHeader
      ?.split(";")
      .find((c) => c.trim().startsWith("auth-token="))
      ?.split("=")[1]

    if (!token) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    let decoded
    try {
      decoded = jwt.verify(token, JWT_SECRET) as { userId: string }
    } catch {
      return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 })
    }

    const userId = decoded.userId

    // Ambil dan validasi body
    const body = await request.json()
    const { nama, no_hp, nik, no_kpj } = body

    if (!nama?.trim() || !no_hp?.trim() || !nik?.trim() || !no_kpj?.trim()) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    const now = new Date()

    const result = await prisma.nasabah.upsert({
      where: { nik },
      update: {
        nama,
        no_hp,
        status: "verified",
        status_langganan: "invalid",
        no_kpj,
        userId,
        isActive: true,
        isSended: true,
        verifiedAt: now,
        updatedAt: now,
      },
      create: {
        id: crypto.randomUUID(),
        nama,
        no_hp,
        status: "verified",
        status_langganan: "invalid",
        nik,
        no_kpj,
        userId,
        isActive: true,
        isSended: true,
        verifiedAt: now,
        updatedAt: now,
      },
    })

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error("Failed to save nasabah:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 })
  }
}

// 🔹 GET - Fetch nasabah milik user login
export async function GET(request: NextRequest) {
  try {
    // Ambil token dari cookie
    const cookieHeader = request.headers.get("cookie")
    const token = cookieHeader
      ?.split(";")
      .find((c) => c.trim().startsWith("auth-token="))
      ?.split("=")[1]

    if (!token) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    let decoded
    try {
      decoded = jwt.verify(token, JWT_SECRET) as { userId: string }
    } catch {
      return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 })
    }

    const userId = decoded.userId

    // Ambil hanya nasabah yang dimiliki oleh user tersebut
    const users = await prisma.nasabah.findMany({
      where: {
        userId: userId,
      },
      select: {
        id: true,
        nama: true,
        no_hp: true,
        nik: true,
        no_kpj: true,
        status: true,
        status_langganan: true,
        isActive: true,
        isSended: true,
        verifiedAt: true,
        updatedAt: true,
        userId: true,
      },
    })

    return NextResponse.json({ success: true, data: users })
  } catch (error) {
    console.error("Failed to fetch nasabah:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 })
  }
}
