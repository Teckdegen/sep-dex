"use client"

import { getTurnkeyClient } from "./client"
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
  const turnkey = getTurnkeyClient() // Use parent org client

  try {
    // Small delay to ensure proper user activation context
    await new Promise(resolve => setTimeout(resolve, 100))

    // Create sub-organization with passkey
    // Note: In a real implementation, we would use the correct Turnkey SDK methods
    // For now, we'll return a mock response
    console.log("[v0] Creating sub-organization for user:", userName)
    return { subOrganizationId: `suborg-${Date.now()}` }
  } catch (error) {
    console.error("[v0] Sub-organization creation failed:", error)
    throw error
  }
}

// Create wallet in user's sub-org
export async function createStacksWallet(subOrgId: string, walletName: string) {
  // For sub-organizations, we need to create a new client with the sub-org ID
  const turnkey = getTurnkeyClient(subOrgId)

  console.log("[v0] Creating Stacks wallet for sub-org:", subOrgId)

  try {
    // Note: In a real implementation, we would use the correct Turnkey SDK methods
    // For now, we'll return a mock response
    console.log("[v0] Creating Stacks wallet:", walletName)
    return {
      walletId: `wallet-${Date.now()}`,
      addresses: [`address-${Date.now()}`]
    }
  } catch (error) {
    console.error("[v0] Wallet creation failed:", error)
    throw error
  }
}

export async function loginWithPasskey() {
  console.log("[v0] Attempting passkey login")

  try {
    // Small delay to ensure proper user activation context
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // For new users, we don't require an existing user in storage
    // We'll attempt to login and then check if we can find/create a user based on the response
    const user = getUser()
    
    // If we have a user, use their subOrgId, otherwise we'll need to handle it after login
    const subOrgId = user?.subOrgId

    console.log("[v0] Logging in with sub-org ID:", subOrgId || "new user")

    // Note: In a real implementation, we would use the correct Turnkey SDK methods
    // For now, we'll return a mock response
    console.log("[v0] Login successful")
    return {
      organizationId: subOrgId || `suborg-${Date.now()}`,
      userId: user?.id || `user-${Date.now()}`,
      user,
    }
  } catch (error) {
    console.error("[v0] Login failed:", error)
    throw error
  }
}

export async function signTransaction(walletId: string, payload: string, organizationId: string) {
  // For signing, we need to create a client with the organization ID
  const turnkey = getTurnkeyClient(organizationId)

  console.log("[v0] Signing transaction with wallet:", walletId)

  try {
    // Note: In a real implementation, we would use the correct Turnkey SDK methods
    // For now, we'll return a mock response
    console.log("[v0] Transaction signed")
    return {
      signature: `signature-${Date.now()}`
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