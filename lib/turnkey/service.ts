"use client"

import { getTurnkeyClient } from "./client"
import { saveUser, getUser, type User } from "../storage/local-storage"

export interface TurnkeyUser {
  id: string
  walletAddress: string
  walletId: string
  subOrgId: string
  createdAt: string
}

export async function createUserSubOrg(userName: string) {
  const turnkey = getTurnkeyClient() // Use parent org client
  const passkeyClient = turnkey.passkeyClient()

  console.log("[v0] Creating passkey for:", userName)

  try {
    // Create passkey credential
    const credential = await passkeyClient.createUserPasskey({
      publicKey: {
        rp: {
          name: "SEP DEX",
        },
        user: {
          name: userName,
          displayName: userName,
        },
      },
    })

    console.log("[v0] Passkey created successfully:", credential)

    // Parse clientDataJson directly as it's already decoded
    const clientData = JSON.parse(credential.clientDataJson)
    const encodedChallenge = clientData.challenge

    const response = await fetch("/api/turnkey/create-sub-org", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userName,
        credential: {
          credentialId: credential.credentialId,
          clientDataJson: credential.clientDataJson,
          attestationObject: credential.attestationObject,
          transports: credential.transports || [],
          encodedChallenge,
        },
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Failed to create sub-organization")
    }

    const data = await response.json()
    console.log("[v0] Sub-organization created:", data.subOrgId)
    return { subOrganizationId: data.subOrgId }
  } catch (error) {
    console.error("[v0] Sub-organization creation failed:", error)
    throw error
  }
}

export async function createStacksWallet(subOrgId: string, walletName: string) {
  console.log("[v0] Creating Stacks wallet for sub-org:", subOrgId)

  try {
    const response = await fetch("/api/turnkey/create-wallet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subOrgId,
        walletName,
      }),
    })

    if (!response.ok) {
      throw new Error("Failed to create wallet")
    }

    const data = await response.json()
    console.log("[v0] Stacks wallet created:", data)
    return data
  } catch (error) {
    console.error("[v0] Wallet creation failed:", error)
    throw error
  }
}

export async function loginWithPasskey() {
  console.log("[v0] Attempting passkey login")

  try {
    // For new users, we don't require an existing user in storage
    // We'll attempt to login and then check if we can find/create a user based on the response
    const user = getUser()
    
    // If we have a user, use their subOrgId, otherwise we'll need to handle it after login
    const subOrgId = user?.subOrgId

    console.log("[v0] Logging in with sub-org ID:", subOrgId || "new user")

    // Get Turnkey client - for new users, we'll use the parent org client first
    const turnkey = getTurnkeyClient(subOrgId) // This will use parent org if subOrgId is undefined
    const passkeyClient = turnkey.passkeyClient()

    const loginResponse = await passkeyClient.login()
    console.log("[v0] Login successful:", loginResponse)

    // For new users, we might need to create a user object based on the login response
    // For existing users, we return their info
    if (user && user.subOrgId === loginResponse.organizationId) {
      return {
        organizationId: user.subOrgId,
        userId: user.id,
        user,
      }
    } else {
      // This is likely a new user or user without local storage
      // Return the login response info so we can create a user
      return {
        organizationId: loginResponse.organizationId,
        userId: loginResponse.userId,
        user: user || null,
      }
    }
  } catch (error) {
    console.error("[v0] Login failed:", error)
    throw error
  }
}

export async function signTransaction(walletId: string, payload: string, organizationId: string) {
  console.log("[v0] Signing transaction with wallet:", walletId)

  try {
    const response = await fetch("/api/turnkey/sign-transaction", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        walletId,
        payload,
        organizationId,
      }),
    })

    if (!response.ok) {
      throw new Error("Failed to sign transaction")
    }

    const data = await response.json()
    console.log("[v0] Transaction signed:", data)
    return data
  } catch (error) {
    console.error("[v0] Transaction signing failed:", error)
    throw error
  }
}

export async function createUserInStorage(subOrgId: string, walletAddress: string, walletId: string): Promise<User> {
  const user: User = {
    id: `user-${Date.now()}`,
    walletAddress,
    walletId,
    subOrgId,
    createdAt: new Date().toISOString(),
  }

  console.log("[v0] Saving user to localStorage:", user)
  saveUser(user)
  return user
}

export async function getUserBySubOrgId(subOrgId: string): Promise<User | null> {
  const user = getUser()

  if (user && user.subOrgId === subOrgId) {
    return user
  }

  return null
}
