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

    const { subOrgId, walletName } = body || {}

    if (!subOrgId) {
      return NextResponse.json(
        { error: "Missing required field: subOrgId" },
        { status: 400 }
      )
    }

    console.log("[v0] Creating Stacks wallet for sub-org:", subOrgId)

    const response = await turnkeyServer.createWallet({
      organizationId: subOrgId,
      walletName: walletName || `stacks-wallet-${Date.now()}`,
      accounts: [
        {
          curve: "CURVE_SECP256K1",
          pathFormat: "PATH_FORMAT_BIP32",
          path: "m/44'/5757'/0'/0/0", // Stacks derivation path
          addressFormat: "ADDRESS_FORMAT_UNCOMPRESSED",
        },
      ],
    })

    console.log("[v0] Stacks wallet created successfully")

    return NextResponse.json({
      walletId: response.walletId,
      addresses: response.addresses,
      success: true,
    })
  } catch (error: any) {
    console.error("[v0] Wallet creation error:", error)
    return NextResponse.json({ error: error.message || "Failed to create wallet" }, { status: 500 })
  }
}