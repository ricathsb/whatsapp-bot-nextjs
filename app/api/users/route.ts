/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import jwt from "jsonwebtoken"

const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET!

export async function POST(request: NextRequest) {
  try {
    // 🔐 Ambil token dari cookie
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
    } catch (err) {
      return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 })
    }

    const userId = decoded.userId

    // 🧾 Ambil payload JSON
    const body = await request.json()
    const { nama, no_hp, nik, no_kpj } = body

    if (!nama || !no_hp || !nik || !no_kpj) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    // Simpan ke DB pakai upsert (berdasarkan nik)
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
        verifiedAt: new Date(),
        updatedAt: new Date(),
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
        verifiedAt: new Date(),
        updatedAt: new Date(),
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

export async function GET(request: NextRequest) {
  try {
    const users = await prisma.nasabah.findMany()
    return NextResponse.json({ success: true, data: users })
  } catch (error) {
    console.error("Failed to fetch nasabah:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 })
  }
}

