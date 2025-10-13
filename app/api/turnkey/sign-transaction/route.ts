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
    let body;
    try {
      body = await request.json()
    } catch (parseError) {
      console.error("[v0] Failed to parse request body:", parseError)
      return NextResponse.json(
        { error: "Invalid request body format" },
        { status: 400 }
      )
    }

    const { walletId, payload, organizationId } = body || {}

    if (!walletId || !payload || !organizationId) {
      return NextResponse.json(
        { error: "Missing required fields: walletId, payload, and organizationId" },
        { status: 400 }
      )
    }

    console.log("[v0] Signing transaction with wallet:", walletId)

    const response = await turnkeyServer.signRawPayload({
      organizationId,
      signWith: walletId,
      payload,
      encoding: "PAYLOAD_ENCODING_HEXADECIMAL",
      hashFunction: "HASH_FUNCTION_SHA256",
    })

    console.log("[v0] Transaction signed successfully")

    return NextResponse.json({
      signature: {
        r: response.r,
        s: response.s,
        v: response.v
      },
      success: true,
    })
  } catch (error: any) {
    console.error("[v0] Transaction signing error:", error)
    return NextResponse.json({ error: error.message || "Failed to sign transaction" }, { status: 500 })
  }
}