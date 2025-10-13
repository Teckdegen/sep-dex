import { Turnkey as TurnkeyServerSDK } from "@turnkey/sdk-server";
import { NextRequest, NextResponse } from "next/server";

type TBody = {
  organizationId: string;
  walletName: string;
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

    // Create Stacks wallet in the sub-organization
    const response = await client.apiClient().createWallet({
      organizationId: body.organizationId,
      walletName: body.walletName,
      accounts: [
        {
          curve: "CURVE_SECP256K1",
          pathFormat: "PATH_FORMAT_BIP32",
          path: "m/44'/5757'/0'/0/0",
          addressFormat: "ADDRESS_FORMAT_UNCOMPRESSED",
        },
      ],
    });

    // Get the wallet accounts to retrieve the address
    const accountsResponse = await client.apiClient().getWalletAccounts({
      organizationId: body.organizationId,
      walletId: response.walletId,
    });

    return NextResponse.json({
      walletId: response.walletId,
      addresses: accountsResponse.accounts.map(account => account.address),
    });
  } catch (e) {
    console.error("Wallet creation error:", e);
    return NextResponse.json(
      {
        error: "failed to create wallet",
        details: e instanceof Error ? e.message : String(e),
      },
      { status: 500 },
    );
  }
}