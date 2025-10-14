"use client"

import { saveUser, getUser, type User } from "../storage/local-storage"
import { randomPrivateKey, privateKeyToPublic, getAddressFromPrivateKey } from '@stacks/transactions'
import { getTurnkeyClient } from "./client"

export interface TurnkeyUser {
  id: string
  walletAddress: string
  walletId: string
  subOrgId: string
  createdAt: string
}

// Update the interface to include privateKey
interface StacksWalletResponse {
  walletId: string
  addresses: string[]
  privateKey?: string // Optional for backward compatibility
}

// Helper to create sub-organization for user (called once per user)
export async function createUserSubOrg(userName: string) {
  try {
    console.log("[v0] Creating sub-organization for user:", userName)
    
    // Dynamically import Turnkey SDK to avoid SSR issues
    const { getTurnkeyClient } = await import("./client");
    
    // Get Turnkey client
    const turnkeyClient = getTurnkeyClient();
    
    // Create sub-organization with passkey (this creates the passkey and sub-org in one step)
    const response = await turnkeyClient.createSubOrganization({
      subOrganizationName: `user-${userName}-${Date.now()}`,
      rootUsers: [{
        userName: userName,
        authenticators: [], // passkey will be added automatically by the WebAuthn stamper
      }],
      rootQuorumThreshold: 1,
    });

    console.log("[v0] Sub-organization created:", response);
    return response;
  } catch (error) {
    console.error("[v0] Sub-organization creation failed:", error);
    throw error;
  }
}

// Create wallet in user's sub-org
export async function createStacksWallet(subOrgId: string, walletName: string): Promise<StacksWalletResponse> {
  console.log("[v0] Creating Stacks wallet for sub-org:", subOrgId)

  try {
    // Dynamically import Turnkey SDK to avoid SSR issues
    const { getTurnkeyClient } = await import("./client");
    
    // Get Turnkey client
    const turnkeyClient = getTurnkeyClient();
    
    // Create Stacks wallet in the sub-organization
    const response = await turnkeyClient.createWallet({
      organizationId: subOrgId,
      walletName: walletName,
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
    const accountsResponse = await turnkeyClient.getWalletAccounts({
      organizationId: subOrgId,
      walletId: response.walletId,
    });

    return {
      walletId: response.walletId,
      addresses: accountsResponse.accounts.map((account: any) => account.address),
    };
  } catch (error) {
    console.error("[v0] Wallet creation failed:", error);
    throw error;
  }
}

export async function loginWithPasskey() {
  console.log("[v0] Attempting passkey login")

  try {
    // Dynamically import Turnkey SDK to avoid SSR issues
    const { getTurnkeyClient } = await import("./client");
    
    // Get Turnkey client
    const turnkeyClient = getTurnkeyClient();
    
    // Attempt passkey login - this will trigger the WebAuthn prompt
    const response = await turnkeyClient.whoami();
    
    console.log("[v0] Passkey login successful:", response);
    return {
      organizationId: response.organizationId,
      userId: response.userId,
      user: {
        userId: response.userId,
        username: response.username || "user"
      }
    }
  } catch (error) {
    console.error("[v0] Passkey login failed:", error);
    throw error;
  }
}

export async function signTransaction(walletId: string, payload: string, organizationId: string) {
  console.log("[v0] Signing transaction with wallet:", walletId)

  try {
    // Use the API route instead of direct SDK calls
    const response = await fetch('/api/turnkey/sign-message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        message: payload,
        organizationId,
        userId: "user",
        walletId
      }),
    })
    
    if (!response.ok) {
      throw new Error(`Failed to sign transaction: ${response.statusText}`)
    }
    
    const data = await response.json()
    return {
      signature: data.signature
    }
  } catch (error) {
    console.error("[v0] Transaction signing failed:", error)
    throw error
  }
}

export async function createUserInStorage(subOrgId: string, walletAddress: string, walletId: string, privateKey?: string): Promise<User> {
  const user: User = {
    id: `user-${Date.now()}`,
    walletAddress,
    walletId,
    subOrgId,
    createdAt: new Date().toISOString(),
  }

  console.log("[v0] Saving user to localStorage:", user)
  saveUser(user)
  
  // For Turnkey wallets, we don't store private keys as they're managed by Turnkey
  // Only local wallets store private keys in localStorage
  
  return user
}

export async function getUserBySubOrgId(subOrgId: string): Promise<User | null> {
  const user = getUser()

  if (user && user.subOrgId === subOrgId) {
    return user
  }

  return null
}

// Create a local wallet without Turnkey using Stacks.js
export async function createLocalWallet(userName: string): Promise<User> {
  console.log("[v0] Creating local Stacks wallet for:", userName)
  
  try {
    // Check if user already has a local wallet
    const existingUser = getUser()
    if (existingUser && existingUser.subOrgId === "local-wallet") {
      console.log("[v0] User already has a local wallet:", existingUser.walletAddress)
      return existingUser
    }
    
    // Generate a new Stacks private key
    const privateKey = randomPrivateKey()
    const publicKey = privateKeyToPublic(privateKey)
    const address = getAddressFromPrivateKey(privateKey, 'testnet')
    
    // Validate and format private key
    let formattedPrivateKey = privateKey.trim();
    
    // Remove 0x prefix if present
    if (formattedPrivateKey.startsWith('0x')) {
      formattedPrivateKey = formattedPrivateKey.slice(2);
    }
    
    // Handle different key lengths:
    // - 64 characters: standard private key
    // - 65 characters: may have extra digit, take last 64 characters
    // - 66 characters: may have 0x prefix + 64 characters
    if (formattedPrivateKey.length === 65) {
      // For 65-character keys, take the last 64 characters
      formattedPrivateKey = formattedPrivateKey.slice(1);
    } else if (formattedPrivateKey.length === 66) {
      // For 66-character keys, remove first 2 characters (likely 0x) and take next 64
      formattedPrivateKey = formattedPrivateKey.slice(2);
    } else if (formattedPrivateKey.length !== 64) {
      // If not 64 characters after processing, it's invalid
      throw new Error("Generated invalid private key format");
    }
    
    // Ensure it's a valid hex string
    if (!/^[0-9a-fA-F]{64}$/.test(formattedPrivateKey)) {
      throw new Error("Generated invalid private key format");
    }
    
    // Create user object with real Stacks address
    const user: User = {
      id: `local-user-${Date.now()}`,
      walletAddress: address,
      walletId: "local-wallet",
      subOrgId: "local-wallet",
      createdAt: new Date().toISOString(),
    }
    
    // Save to localStorage WITHOUT 0x prefix
    localStorage.setItem('local-wallet-private-key', formattedPrivateKey)
    localStorage.setItem('local-wallet-public-key', publicKey as string)
    localStorage.setItem('local-wallet-address', address)
    localStorage.setItem('local-wallet-username', userName)
    saveUser(user)
    
    console.log("[v0] Local Stacks wallet created with address:", address)
    return user
  } catch (error) {
    console.error("[v0] Failed to create local Stacks wallet:", error)
    throw error
  }
}

// Import existing local wallet with a known private key
export async function importLocalWallet(userName: string, privateKey: string): Promise<User> {
  console.log("[v0] Importing local Stacks wallet for:", userName)
  
  try {
    // Validate and format private key
    let formattedPrivateKey = privateKey.trim();
    
    // Remove 0x prefix if present
    if (formattedPrivateKey.startsWith('0x')) {
      formattedPrivateKey = formattedPrivateKey.slice(2);
    }
    
    // Handle different key lengths:
    // - 64 characters: standard private key
    // - 65 characters: may have extra digit, take last 64 characters
    // - 66 characters: may have 0x prefix + 64 characters
    if (formattedPrivateKey.length === 65) {
      // For 65-character keys, take the last 64 characters
      formattedPrivateKey = formattedPrivateKey.slice(1);
    } else if (formattedPrivateKey.length === 66) {
      // For 66-character keys, remove first 2 characters (likely 0x) and take next 64
      formattedPrivateKey = formattedPrivateKey.slice(2);
    } else if (formattedPrivateKey.length !== 64) {
      // If not 64 characters after processing, it's invalid
      throw new Error("Invalid private key format. Must be a 64-character hexadecimal string.");
    }
    
    // Ensure it's a valid hex string
    if (!/^[0-9a-fA-F]{64}$/.test(formattedPrivateKey)) {
      throw new Error("Invalid private key format. Must be a 64-character hexadecimal string.");
    }
    
    // For Stacks.js functions, we use the private key WITHOUT 0x prefix
    // Get the address from the private key
    const address = getAddressFromPrivateKey(formattedPrivateKey, 'testnet');
    
    // Create user object with the provided wallet
    const user: User = {
      id: `local-user-${Date.now()}`,
      walletAddress: address,
      walletId: "local-wallet",
      subOrgId: "local-wallet",
      createdAt: new Date().toISOString(),
    }
    
    // Save to localStorage WITHOUT 0x prefix
    localStorage.setItem('local-wallet-private-key', formattedPrivateKey)
    localStorage.setItem('local-wallet-address', address)
    localStorage.setItem('local-wallet-username', userName)
    saveUser(user)
    
    console.log("[v0] Local Stacks wallet imported with address:", address)
    return user
  } catch (error) {
    console.error("[v0] Failed to import local Stacks wallet:", error)
    throw error
  }
}

// Get local wallet private key
export function getLocalWalletPrivateKey(): string | null {
  const privateKey = localStorage.getItem('local-wallet-private-key')
  if (privateKey) {
    // Validate and format private key
    let formattedPrivateKey = privateKey.trim();
    
    // Remove 0x prefix if present (just in case)
    if (formattedPrivateKey.startsWith('0x')) {
      formattedPrivateKey = formattedPrivateKey.slice(2);
    }
    
    // Handle different key lengths:
    // - 64 characters: standard private key
    // - 65 characters: may have extra digit, take last 64 characters
    // - 66 characters: may have 0x prefix + 64 characters
    if (formattedPrivateKey.length === 65) {
      // For 65-character keys, take the last 64 characters
      formattedPrivateKey = formattedPrivateKey.slice(1);
    } else if (formattedPrivateKey.length === 66) {
      // For 66-character keys, remove first 2 characters (likely 0x) and take next 64
      formattedPrivateKey = formattedPrivateKey.slice(2);
    } else if (formattedPrivateKey.length !== 64) {
      // If not 64 characters after processing, it's invalid
      console.error("[v0] Invalid private key format in local storage:", formattedPrivateKey);
      return null;
    }
    
    // Ensure it's a valid hex string
    if (!/^[0-9a-fA-F]{64}$/.test(formattedPrivateKey)) {
      console.error("[v0] Invalid private key format in local storage:", formattedPrivateKey);
      return null;
    }
    
    // Return WITHOUT 0x prefix as expected by Stacks.js
    return formattedPrivateKey;
  }
  return null
}

// Get Turnkey wallet private key
// In a real implementation, Turnkey would manage private keys
// For this implementation, we return null as Turnkey manages keys securely
export function getTurnkeyWalletPrivateKey(): string | null {
  // In a real Turnkey implementation, private keys are never exposed
  // They are managed securely by Turnkey and used for signing operations
  console.log("[v0] Turnkey wallets do not expose private keys - they are managed securely by Turnkey")
  return null
}