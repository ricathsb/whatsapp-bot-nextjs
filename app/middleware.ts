import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import jwt from "jsonwebtoken"

export function middleware(request: NextRequest) {
  const token = request.cookies.get("auth-token")?.value

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  try {
    // Validasi token
    jwt.verify(token, process.env.JWT_SECRET || "your-secret-key")
    return NextResponse.next()
  } catch {
    return NextResponse.redirect(new URL("/login", request.url))
  }
}

// Aktifkan middleware hanya untuk halaman root/dashboard
export const config = {
  matcher: ["/"], // Bisa ditambah "/dashboard", "/admin", dll kalau perlu
}
