"use server";

import { Turnkey } from "@turnkey/sdk-server";

// Initialize the Turnkey Server Client on the server-side
const turnkeyServer = new Turnkey({
  apiBaseUrl: "https://api.turnkey.com",
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY,
  apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY,
  defaultOrganizationId: process.env.TURNKEY_ORGANIZATION_ID,
}).apiClient();

export type TAttestation = {
  credentialId: string;
  clientDataJson: string;
  attestationObject: string;
  transports: (
    | "AUTHENTICATOR_TRANSPORT_BLE"
    | "AUTHENTICATOR_TRANSPORT_INTERNAL"
    | "AUTHENTICATOR_TRANSPORT_NFC"
    | "AUTHENTICATOR_TRANSPORT_USB"
    | "AUTHENTICATOR_TRANSPORT_HYBRID"
  )[];
};

export const createSubOrganization = async (
  userName: string,
  email: string,
  challenge: string,
  attestation: TAttestation,
) => {
  try {
    console.log("[v0] Creating sub-organization for user:", userName, "with email:", email)

    const createSubOrgResponse = await turnkeyServer.createSubOrganization({
      subOrganizationName: `user-${userName}-${Date.now()}`,
      rootUsers: [
        {
          userName: userName,
          userEmail: email,
          apiKeys: [],
          authenticators: [
            {
              authenticatorName: `${userName}-passkey`,
              challenge: challenge,
              attestation: attestation,
            },
          ],
          oauthProviders: [],
        },
      ],
      rootQuorumThreshold: 1,
      wallet: {
        walletName: `${userName}-stacks-wallet`,
        accounts: [
          {
            curve: "CURVE_SECP256K1",
            pathFormat: "PATH_FORMAT_BIP32",
            path: "m/44'/5757'/0'/0/0",
            addressFormat: "ADDRESS_FORMAT_UNCOMPRESSED",
          },
        ],
      },
    });

    console.log("[v0] Sub-organization created successfully:", createSubOrgResponse)
    return createSubOrgResponse;
  } catch (error) {
    console.error("[v0] Failed to create sub-organization:", error);
    throw error;
  }
};
