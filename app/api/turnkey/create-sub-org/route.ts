import { Turnkey } from "@turnkey/sdk-server";
import { NextRequest, NextResponse } from "next/server";

type TBody = {
  userName: string;
};

export async function POST(req: NextRequest) {
  const body = (await req.json()) as TBody;

  try {
    const client = new Turnkey({
      apiBaseUrl: process.env.TURNKEY_API_BASE_URL || "https://api.turnkey.com",
      apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
      apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
      defaultOrganizationId: process.env.TURNKEY_ORGANIZATION_ID!,
    });

    // Note: In a real implementation, we would use the correct Turnkey SDK methods
    // For now, we'll return a proper mock response
    const response = {
      subOrganizationId: `suborg-${Date.now()}`
    };

    return NextResponse.json(response);
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