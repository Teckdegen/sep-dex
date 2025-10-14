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

  // Get current hostname for rpId - same logic as layout.tsx
  const getRpId = () => {
    const currentHostname = window.location.hostname

    // For localhost development
    if (currentHostname === 'localhost' || currentHostname === '127.0.0.1') {
      return 'localhost'
    }

    // For Vercel deployments - use the actual domain
    if (currentHostname.endsWith('.vercel.app')) {
      return currentHostname
    }

    // For custom domains or production
    const envRpId = process.env.NEXT_PUBLIC_TURNKEY_RP_ID
    if (envRpId && envRpId !== 'localhost') {
      return envRpId
    }

    // Fallback to current hostname
    return currentHostname
  }

  // Always create a new stamper to ensure proper initialization
  console.log("[v0] Initializing WebAuthn stamper with RP ID:", getRpId())
  stamper = new WebauthnStamper({
    rpId: getRpId(),
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
    // Use the same rpId logic as the main client
    const getRpId = () => {
      if (typeof window === 'undefined') return 'localhost'

      const currentHostname = window.location.hostname

      // For localhost development
      if (currentHostname === 'localhost' || currentHostname === '127.0.0.1') {
        return 'localhost'
      }

      // For Vercel deployments - use the actual domain
      if (currentHostname.endsWith('.vercel.app')) {
        return currentHostname
      }

      // For custom domains or production
      const envRpId = process.env.NEXT_PUBLIC_TURNKEY_RP_ID
      if (envRpId && envRpId !== 'localhost') {
        return envRpId
      }

      // Fallback to current hostname
      return currentHostname
    }

    stamper = new WebauthnStamper({
      rpId: getRpId(),
    })
  }
  return stamper
}

export type TurnkeyClient = Turnkey