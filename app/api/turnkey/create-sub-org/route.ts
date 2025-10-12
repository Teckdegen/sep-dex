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
    const { userName, credential } = await request.json()

    console.log("[v0] Creating sub-organization for:", userName)
    console.log("[v0] Credential data:", {
      credentialId: credential.credentialId,
      hasChallenge: !!credential.encodedChallenge,
      hasAttestation: !!credential.attestationObject,
    })

    const response = await turnkeyServer.createSubOrganization({
      subOrganizationName: `sep-dex-${userName}-${Date.now()}`,
      rootUsers: [
        {
          userName: userName,
          userEmail: `${userName}@sepdex.local`,
          authenticators: [
            {
              authenticatorName: `${userName}-passkey`,
              challenge: credential.encodedChallenge,
              attestation: {
                credentialId: credential.credentialId,
                clientDataJson: credential.clientDataJson,
                attestationObject: credential.attestationObject,
                transports: credential.transports || [],
              },
            },
          ],
        },
      ],
      rootQuorumThreshold: 1,
    })

    console.log("[v0] Sub-organization created successfully:", response.subOrganizationId)

    return NextResponse.json({
      subOrgId: response.subOrganizationId,
      success: true,
    })
  } catch (error: any) {
    console.error("[v0] Sub-organization creation error:", error)
    return NextResponse.json(
      {
        error: error.message || "Failed to create sub-organization",
        details: error.toString(),
      },
      { status: 500 },
    )
  }
}
