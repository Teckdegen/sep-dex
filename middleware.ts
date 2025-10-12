import { NextResponse, type NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // Add Permissions-Policy headers for WebAuthn/Passkey support
  response.headers.set("Permissions-Policy", "publickey-credentials-create=*, publickey-credentials-get=*")

  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
