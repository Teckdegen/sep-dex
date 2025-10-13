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
    
    // Use the API route instead of direct SDK calls
    const response = await fetch('/api/turnkey/create-sub-org', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userName }),
    })
    
    if (!response.ok) {
      throw new Error(`Failed to create sub-organization: ${response.statusText}`)
    }
    
    const data = await response.json()
    return { subOrganizationId: data.subOrganizationId }
  } catch (error) {
    console.error("[v0] Sub-organization creation failed:", error)
    throw error
  }
}

// Create wallet in user's sub-org
export async function createStacksWallet(subOrgId: string, walletName: string): Promise<StacksWalletResponse> {
  console.log("[v0] Creating Stacks wallet for sub-org:", subOrgId)

  try {
    // Use the API route instead of direct SDK calls
    const response = await fetch('/api/turnkey/create-wallet', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ subOrganizationId: subOrgId, walletName }),
    })
    
    if (!response.ok) {
      throw new Error(`Failed to create wallet: ${response.statusText}`)
    }
    
    const data = await response.json()
    return {
      walletId: data.walletId,
      addresses: data.addresses,
      privateKey: data.privateKey // Include the private key for mock implementation
    }
  } catch (error) {
    console.error("[v0] Wallet creation failed:", error)
    throw error
  }
}

export async function loginWithPasskey() {
  console.log("[v0] Attempting passkey login")

  try {
    // Use the API route instead of direct SDK calls
    const response = await fetch('/api/turnkey/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}), // No body needed for login
    })
    
    if (!response.ok) {
      throw new Error(`Login failed: ${response.statusText}`)
    }
    
    const data = await response.json()
    return {
      organizationId: data.organizationId,
      userId: data.userId,
      user: {
        userId: data.userId,
        username: "user"
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
  
  // For Turnkey wallets, also store the private key
  if (privateKey) {
    // Validate private key format
    let formattedPrivateKey = privateKey.trim();
    
    // Remove 0x prefix if present
    if (formattedPrivateKey.startsWith('0x')) {
      formattedPrivateKey = formattedPrivateKey.slice(2);
    }
    
    // Ensure it's a valid 64-character hex string
    if (!/^[0-9a-fA-F]{64}$/.test(formattedPrivateKey)) {
      console.error("[v0] Invalid Turnkey private key format:", formattedPrivateKey);
      throw new Error("Invalid Turnkey private key format");
    }
    
    // Store WITHOUT 0x prefix
    localStorage.setItem('turnkey-wallet-private-key', formattedPrivateKey)
  }
  
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
    
    // Validate private key format
    let formattedPrivateKey = privateKey.trim();
    
    // Remove 0x prefix if present
    if (formattedPrivateKey.startsWith('0x')) {
      formattedPrivateKey = formattedPrivateKey.slice(2);
    }
    
    // Ensure it's a valid 64-character hex string
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
    // Validate private key format
    let formattedPrivateKey = privateKey.trim();
    
    // Remove 0x prefix if present
    if (formattedPrivateKey.startsWith('0x')) {
      formattedPrivateKey = formattedPrivateKey.slice(2);
    }
    
    // Ensure it's a valid 64-character hex string
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
    // Validate private key format
    let formattedPrivateKey = privateKey.trim();
    
    // Remove 0x prefix if present (just in case)
    if (formattedPrivateKey.startsWith('0x')) {
      formattedPrivateKey = formattedPrivateKey.slice(2);
    }
    
    // Ensure it's a valid 64-character hex string
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
// For this mock, we use the private key stored when the wallet was created
export function getTurnkeyWalletPrivateKey(): string | null {
  // Get the private key that was stored when the Turnkey wallet was created
  const turnkeyPrivateKey = localStorage.getItem('turnkey-wallet-private-key')
  if (turnkeyPrivateKey) {
    // Validate private key format
    let formattedPrivateKey = turnkeyPrivateKey.trim();
    
    // Remove 0x prefix if present (just in case)
    if (formattedPrivateKey.startsWith('0x')) {
      formattedPrivateKey = formattedPrivateKey.slice(2);
    }
    
    // Ensure it's a valid 64-character hex string
    if (!/^[0-9a-fA-F]{64}$/.test(formattedPrivateKey)) {
      console.error("[v0] Invalid Turnkey private key format in local storage:", formattedPrivateKey);
      return null;
    }
    
    // Return WITHOUT 0x prefix as expected by Stacks.js
    return formattedPrivateKey;
  }
  
  return null
}