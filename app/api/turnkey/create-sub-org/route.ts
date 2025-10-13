import { Turnkey as TurnkeyServerSDK } from "@turnkey/sdk-server";
import { NextRequest, NextResponse } from "next/server";

type TBody = {
  userName: string;
};

export async function POST(req: NextRequest) {
  const body = (await req.json()) as TBody;

  try {
    const client = new TurnkeyServerSDK({
      apiBaseUrl: process.env.TURNKEY_BASE_URL!,
      apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
      apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
      defaultOrganizationId: process.env.TURNKEY_ORGANIZATION_ID!,
    });

    // Create sub-organization with passkey
    const response = await client.apiClient().createSubOrganization({
      subOrganizationName: `${body.userName}-${Date.now()}`,
      rootUsers: [
        {
          userName: body.userName,
          authenticators: [], // Passkey will be added during registration
        },
      ],
      rootQuorumThreshold: 1,
    });

    return NextResponse.json({
      subOrganizationId: response.subOrganizationId,
    });
  } catch (e) {
    console.error("Sub-org creation error:", e);
    return NextResponse.json(
      {
        error: "failed to create sub-organization",
        details: e instanceof Error ? e.message : String(e),
      },
      { status: 500 },
    );
  }
}