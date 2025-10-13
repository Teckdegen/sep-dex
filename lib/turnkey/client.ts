"use client"

import { Turnkey } from "@turnkey/sdk-browser"
import { WebauthnStamper } from "@turnkey/webauthn-stamper"

let parentTurnkeyClient: Turnkey | null = null
let stamper: WebauthnStamper | null = null

export function getTurnkeyClient(organizationId?: string) {
  if (!stamper) {
    stamper = new WebauthnStamper({
      rpId: typeof window !== "undefined" ? window.location.hostname : "localhost",
    })
  }

  // If organizationId is provided, create a new client for that org
  if (organizationId) {
    return new Turnkey({
      apiBaseUrl: "https://api.turnkey.com",
      defaultOrganizationId: organizationId,
    })
  }

  // Otherwise return the parent org client
  if (parentTurnkeyClient) {
    return parentTurnkeyClient
  }

  parentTurnkeyClient = new Turnkey({
    apiBaseUrl: "https://api.turnkey.com",
    defaultOrganizationId: process.env.NEXT_PUBLIC_TURNKEY_ORGANIZATION_ID!,
  })

  return parentTurnkeyClient
}

export function getStamper() {
  if (!stamper) {
    stamper = new WebauthnStamper({
      rpId: typeof window !== "undefined" ? window.location.hostname : "localhost",
    })
  }
  return stamper
}

export type TurnkeyClient = Turnkey