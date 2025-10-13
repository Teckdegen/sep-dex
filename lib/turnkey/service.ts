"use client"

import { saveUser, getUser, type User } from "../storage/local-storage"
import { randomPrivateKey, privateKeyToPublic, getAddressFromPrivateKey } from '@stacks/transactions'

export interface TurnkeyUser {
  id: string
  walletAddress: string
  walletId: string
  subOrgId: string
  createdAt: string
}

// Helper to create sub-organization for user (called once per user)
export async function createUserSubOrg(userName: string) {
  try {
    // Create sub-organization with passkey
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
export async function createStacksWallet(subOrgId: string, walletName: string) {
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
      addresses: data.addresses
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
    
    // Ensure private key is in the correct format (0x prefixed hex string)
    const formattedPrivateKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`
    
    // Create user object with real Stacks address
    const user: User = {
      id: `local-user-${Date.now()}`,
      walletAddress: address,
      walletId: "local-wallet",
      subOrgId: "local-wallet",
      createdAt: new Date().toISOString(),
    }
    
    // Save to localStorage
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

// Get local wallet private key
export function getLocalWalletPrivateKey(): string | null {
  const privateKey = localStorage.getItem('local-wallet-private-key')
  if (privateKey) {
    // Ensure private key is in the correct format
    return privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`
  }
  return null
}

// Get Turnkey wallet private key
// In a real implementation, Turnkey would manage private keys
// For this mock, we generate and store real private keys
export function getTurnkeyWalletPrivateKey(): string | null {
  // Check if we already have a private key for this Turnkey wallet
  const turnkeyPrivateKey = localStorage.getItem('turnkey-wallet-private-key')
  if (turnkeyPrivateKey) {
    // Ensure private key is in the correct format
    return turnkeyPrivateKey.startsWith('0x') ? turnkeyPrivateKey : `0x${turnkeyPrivateKey}`
  }
  
  // Generate a new real private key for Turnkey wallets
  const newPrivateKey = randomPrivateKey()
  // Ensure private key is in the correct format (0x prefixed hex string)
  const formattedPrivateKey = newPrivateKey.startsWith('0x') ? newPrivateKey : `0x${newPrivateKey}`
  localStorage.setItem('turnkey-wallet-private-key', formattedPrivateKey)
  return formattedPrivateKey
}