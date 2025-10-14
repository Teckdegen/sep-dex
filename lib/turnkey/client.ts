"use client"

import { Turnkey } from "@turnkey/sdk-browser"
import { WebauthnStamper } from "@turnkey/webauthn-stamper"

let parentTurnkeyClient: Turnkey | null = null
let stamper: WebauthnStamper | null = null

export function getTurnkeyClient(organizationId?: string) {
  // Ensure we're in a browser environment
  if (typeof window === "undefined") {
    throw new Error("Turnkey client can only be used in browser environment")
  }

  // Get current hostname for rpId
  const currentHostname = window.location.hostname

  // Always create a new stamper to ensure proper initialization
  console.log("[v0] Initializing WebAuthn stamper with RP ID:", currentHostname)
  stamper = new WebauthnStamper({
    rpId: currentHostname,
  })

  // Attach the stamper to the client
  const clientConfig: any = {
    apiBaseUrl: "https://api.turnkey.com",
    defaultOrganizationId: organizationId || process.env.NEXT_PUBLIC_TURNKEY_ORGANIZATION_ID!,
    stamper: stamper,
  }

  // If organizationId is provided, create a new client for that org
  if (organizationId) {
    console.log("[v0] Creating Turnkey client for organization:", organizationId)
    return new Turnkey(clientConfig)
  }

  // Otherwise return the parent org client
  if (parentTurnkeyClient) {
    console.log("[v0] Returning existing Turnkey client")
    return parentTurnkeyClient
  }

  console.log("[v0] Creating new parent Turnkey client")
  parentTurnkeyClient = new Turnkey(clientConfig)
  return parentTurnkeyClient
}

export function getStamper() {
  if (!stamper) {
    const hostname = typeof window !== 'undefined' ? window.location.hostname : "localhost"
    stamper = new WebauthnStamper({
      rpId: hostname,
    })
  }
  return stamper
}

export type TurnkeyClient = Turnkey