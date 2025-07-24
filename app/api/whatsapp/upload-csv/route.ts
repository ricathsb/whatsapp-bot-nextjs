/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { parse } from "csv-parse/sync"
import jwt from "jsonwebtoken"

const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET!

export async function POST(request: NextRequest) {
  try {
    // ✅ Ambil token dari cookie
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
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("csv") as File
    if (!file) {
      return NextResponse.json({ success: false, error: "No file provided" })
    }

    const text = await file.text()
    const records = parse(text, { columns: true, skip_empty_lines: true, trim: true })

    let inserted = 0
    for (const record of records) {
      const { nama, no_hp, nik, no_kpj } = record
      if (!nik || !no_kpj) continue

          await prisma.nasabah.upsert({
      where: { nik },
      update: {
        nama,
        no_hp,
        status: "verified",
        status_langganan: "invalid",
        no_kpj,
        userId,
        isActive: true,
        verifiedAt: new Date(),     // ← tambahkan ini
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
        verifiedAt: new Date(),     // ← tambahkan ini
        updatedAt: new Date(),
      },
    })


      inserted++
    }

    return NextResponse.json({
      success: true,
      inserted,
      message: `${inserted} nasabah berhasil ditambahkan atau diperbarui.`,
    })
  } catch (error) {
    console.error("Failed to upload CSV:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
