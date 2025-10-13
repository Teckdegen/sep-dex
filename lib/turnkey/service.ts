"use client"

import { getTurnkeyClient, getStamper } from "./client"
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
    // Create sub-organization with passkey
    console.log("[v0] Creating sub-organization for user:", userName)
    
    const stamper = getStamper()
    const publicKey = stamper.credential.publicKey
    
    const response = await turnkey.createSubOrganization({
      subOrganizationName: `${userName}'s Organization`,
      rootQuorumThreshold: 1,
      rootUsers: [
        {
          userName: `${userName}'s User`,
          apiKeys: [],
          authenticators: [
            {
              publicKey,
              signature: "", // Will be signed by the stamper
              challenge: ""  // Will be provided by the server
            }
          ]
        }
      ]
    })

    return { subOrganizationId: response.subOrganizationId }
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
    // Create a Stacks wallet using Turnkey
    const response = await turnkey.createWallet({
      walletName: walletName,
      accounts: [
        {
          curve: "STACKS",
          pathFormat: "bip32",
          path: "m/44'/5757'/0'/0/0", // Standard Stacks derivation path
          addressFormat: "stacks"
        }
      ]
    })

    // Get the wallet address
    const wallet = await turnkey.getWallet({ walletId: response.walletId })
    const address = wallet.addresses[0]

    return {
      walletId: response.walletId,
      addresses: [address]
    }
  } catch (error) {
    console.error("[v0] Wallet creation failed:", error)
    throw error
  }
}

export async function loginWithPasskey() {
  console.log("[v0] Attempting passkey login")

  try {
    const turnkey = getTurnkeyClient()
    
    // Perform passkey authentication
    const response = await turnkey.loginWithPasskey()
    
    console.log("[v0] Login successful")
    return {
      organizationId: response.organizationId,
      userId: response.userId,
      user: response.user,
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
    // Sign the transaction using Turnkey
    const response = await turnkey.signTransaction({
      walletId,
      payload,
      encoding: "utf-8"
    })

    return {
      signature: response.signature
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