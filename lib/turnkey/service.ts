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

// Helper to create sub-organization for user (called once per user)
export async function createUserSubOrg(userName: string) {
  const turnkey = getTurnkeyClient() // Use parent org client

  try {
    // Small delay to ensure proper user activation context
    await new Promise(resolve => setTimeout(resolve, 100));

    const response = await turnkey.apiClient().createSubOrganization({
      subOrganizationName: `sep-dex-user-${userName}-${Date.now()}`,
      rootUsers: [{
        userName: userName,
        userEmail: `${userName}@sepdex.local`,
        apiKeys: [],
        oauthProviders: [],
        authenticators: [], // passkey will be added during the process
      }],
      rootQuorumThreshold: 1,
    });

    console.log("[v0] Sub-organization created:", response);
    return { subOrganizationId: response.subOrganizationId };
  } catch (error) {
    console.error("[v0] Sub-organization creation failed:", error);
    throw error;
  }
}

// Create wallet in user's sub-org
export async function createStacksWallet(subOrgId: string, walletName: string) {
  const turnkey = getTurnkeyClient(subOrgId);

  console.log("[v0] Creating Stacks wallet for sub-org:", subOrgId);

  try {
    const response = await turnkey.apiClient().createWallet({
      organizationId: subOrgId,
      walletName: walletName || `stacks-wallet-${Date.now()}`,
      accounts: [{
        curve: "CURVE_SECP256K1",
        pathFormat: "PATH_FORMAT_BIP32",
        path: "m/44'/5757'/0'/0/0",
        addressFormat: "ADDRESS_FORMAT_UNCOMPRESSED",
      }],
    });

    console.log("[v0] Stacks wallet created:", response);
    return response;
  } catch (error) {
    console.error("[v0] Wallet creation failed:", error);
    throw error;
  }
}

export async function loginWithPasskey() {
  console.log("[v0] Attempting passkey login");

  try {
    // Small delay to ensure proper user activation context
    await new Promise(resolve => setTimeout(resolve, 100));
    
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
  const turnkey = getTurnkeyClient(organizationId);

  console.log("[v0] Signing transaction with wallet:", walletId);

  try {
    const response = await turnkey.apiClient().signRawPayload({
      organizationId,
      signWith: walletId,
      payload,
      encoding: "PAYLOAD_ENCODING_HEXADECIMAL",
      hashFunction: "HASH_FUNCTION_SHA256",
    });

    console.log("[v0] Transaction signed:", response);
    return response;
  } catch (error) {
    console.error("[v0] Transaction signing failed:", error);
    throw error;
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