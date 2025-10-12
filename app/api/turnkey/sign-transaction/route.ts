import { type NextRequest, NextResponse } from "next/server"
import { Turnkey } from "@turnkey/sdk-server"

const turnkeyServer = new Turnkey({
  apiBaseUrl: "https://api.turnkey.com",
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
  defaultOrganizationId: process.env.NEXT_PUBLIC_TURNKEY_ORGANIZATION_ID!,
}).apiClient()

export async function POST(request: NextRequest) {
  try {
    const { walletId, payload, organizationId } = await request.json()

    console.log("[v0] Signing transaction with wallet:", walletId)

    const response = await turnkeyServer.signRawPayload({
      organizationId,
      signWith: walletId,
      payload,
      encoding: "HEXADECIMAL",
      hashFunction: "SHA256",
    })

    console.log("[v0] Transaction signed successfully")

    return NextResponse.json({
      signature: response.signature,
      success: true,
    })
  } catch (error: any) {
    console.error("[v0] Transaction signing error:", error)
    return NextResponse.json({ error: error.message || "Failed to sign transaction" }, { status: 500 })
  }
}
