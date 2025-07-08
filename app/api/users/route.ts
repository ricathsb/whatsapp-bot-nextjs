/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import jwt from "jsonwebtoken"

const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET!

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

    // Verifikasi JWT
    let decoded
    try {
      decoded = jwt.verify(token, JWT_SECRET) as { userId: string }
    } catch (err) {
      return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 })
    }

    const userId = decoded.userId

    // Ambil hanya nasabah milik user ini
    const nasabahList = await prisma.nasabah.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    })

    return NextResponse.json({
      success: true,
      data: nasabahList,
    })
  } catch (error) {
    console.error("Failed to fetch nasabah:", error)
    return NextResponse.json({
      success: false,
      error: "Internal server error",
    }, { status: 500 })
  }
}
