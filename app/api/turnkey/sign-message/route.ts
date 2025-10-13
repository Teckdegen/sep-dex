import { Turnkey as TurnkeyServerSDK } from "@turnkey/sdk-server";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

type TBody = {
  message: string;
  organizationId: string;
  userId: string;
  walletId: string;
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

    // Ensure payload is 32 bytes (64 hex chars)
    let payload = body.message.replace(/^0x/, "");

    // If not 32 bytes, hash it with SHA256
    if (payload.length !== 64) {
      payload = crypto
        .createHash("sha256")
        .update(payload, "hex")
        .digest("hex");
    }

    const response = await client.apiClient().signRawPayload({
      organizationId: body.organizationId,
      signWith: body.walletId,
      payload,
      encoding: "PAYLOAD_ENCODING_HEXADECIMAL",
      hashFunction: "HASH_FUNCTION_NO_OP",
    });

    return NextResponse.json(response);
  } catch (e) {
    console.error("Signing error:", e);
    return NextResponse.json(
      {
        error: "failed to sign",
        details: e instanceof Error ? e.message : String(e),
      },
      { status: 500 },
    );
  }
}