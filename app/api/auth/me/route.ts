/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import whatsappService from "@/lib/whatsapp-service"

export async function GET(request: Request) {
  const cookieHeader = request.headers.get("cookie")
  const authHeader = request.headers.get("authorization")

  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : null

  const token =
    bearerToken ||
    cookieHeader
      ?.split(";")
      .find((c) => c.trim().startsWith("auth-token="))
      ?.split("=")[1]

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const cleanToken = decodeURIComponent(token)

  try {
    const decoded = jwt.verify(cleanToken, process.env.JWT_SECRET!) as {
      userId: string
      email: string
    }

    console.log("[API] ✅ Decoded userId:", decoded.userId)

    const loadedCount = await whatsappService.loadUsersFromDatabase(cleanToken)

    return NextResponse.json({
      user: decoded,
      loaded: loadedCount,
      users: whatsappService.getUsers(),
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: "Invalid token", detail: err.message },
      { status: 401 }
    )
  }
}
