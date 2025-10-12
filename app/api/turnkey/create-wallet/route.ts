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
    const { subOrgId, walletName } = await request.json()

    console.log("[v0] Creating Stacks wallet for sub-org:", subOrgId)

    const response = await turnkeyServer.createWallet({
      organizationId: subOrgId,
      walletName: walletName || `stacks-wallet-${Date.now()}`,
      accounts: [
        {
          curve: "SECP256K1",
          pathFormat: "BIP32",
          path: "m/44'/5757'/0'/0/0", // Stacks derivation path
          addressFormat: "UNCOMPRESSED",
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
