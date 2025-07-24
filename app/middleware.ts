import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import jwt from "jsonwebtoken"

export function middleware(request: NextRequest) {
  // Skip middleware for login page and API auth routes
  if (request.nextUrl.pathname.startsWith("/login") || request.nextUrl.pathname.startsWith("/api/auth/login")) {
    return NextResponse.next()
  }

  const token = request.cookies.get("auth-token")?.value

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  try {
    // Validate token
    jwt.verify(token, process.env.JWT_SECRET || "your-secret-key")
    return NextResponse.next()
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    // Clear invalid token and redirect
    const response = NextResponse.redirect(new URL("/login", request.url))
    response.cookies.set("auth-token", "", { maxAge: 0 })
    return response
  }
}

// Apply middleware to all routes except login and auth APIs
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (authentication API routes)
     * - login (login page)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api/auth|login|_next/static|_next/image|favicon.ico).*)",
  ],
}
