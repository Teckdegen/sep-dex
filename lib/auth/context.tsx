"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { getUser, clearUser, type User } from "../storage/local-storage"
import { createUserSubOrg, createStacksWallet, loginWithPasskey, createUserInStorage } from "../turnkey/service"
import { depositStx } from "../stacks-client" // Import Stacks client

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  createWallet: (userName: string) => Promise<User>
  login: () => Promise<User>
  loginOrCreateWallet: (userName: string) => Promise<User> // New unified function
  logout: () => void
  depositCollateral: (amount: number) => Promise<string> // New function for depositing to contract
  createWalletWithPasskey: (userName: string) => Promise<User> // Simplified one-time wallet creation
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    try {
      const existingUser = getUser()

      if (existingUser) {
        setUser(existingUser)
        console.log("[v0] User authenticated:", existingUser.walletAddress)
      }
    } catch (error) {
      console.error("[v0] Auth check failed:", error)
    } finally {
      setIsLoading(false)
    }
  }

  async function createWalletWithPasskey(userName: string): Promise<User> {
    try {
      setIsLoading(true)
      console.log("[v0] Creating Turnkey wallet with passkey for:", userName)

      // Create sub-organization with passkey (this creates the passkey and sub-org in one step)
      const subOrgResponse = await createUserSubOrg(userName)
      const subOrgId = subOrgResponse.subOrganizationId

      // Create Stacks wallet
      const walletResponse = await createStacksWallet(subOrgId, `${userName}-stacks-wallet`)
      const walletId = walletResponse.walletId
      const walletAddress = walletResponse.addresses[0] // First address

      // Save user to localStorage
      const newUser = await createUserInStorage(subOrgId, walletAddress, walletId)
      setUser(newUser)

      console.log("[v0] Turnkey wallet created successfully with passkey:", newUser.walletAddress)
      return newUser
    } catch (error) {
      console.error("[v0] Wallet creation with passkey failed:", error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  async function createWallet(userName: string): Promise<User> {
    return createWalletWithPasskey(userName)
  }

  async function login(): Promise<User> {
    try {
      setIsLoading(true)
      console.log("[v0] Attempting passkey login")

      // Try login with passkey
      const loginResponse = await loginWithPasskey()
      
      // Check if we have an existing user
      const existingUser = getUser()

      if (existingUser && existingUser.subOrgId === loginResponse.organizationId) {
        setUser(existingUser)
        console.log("[v0] Login successful for existing user:", existingUser.walletAddress)
        return existingUser
      } else if (loginResponse.organizationId) {
        // This is a new user or user without local storage
        // We need to get or create their wallet info
        console.log("[v0] New user login, need to create user object")
        // For now, we'll throw an error asking them to create a wallet
        throw new Error("Please create a wallet first")
      }

      throw new Error("Login failed")
    } catch (loginError) {
      console.error("[v0] Login failed:", loginError)
      throw loginError
    } finally {
      setIsLoading(false)
    }
  }

  async function depositCollateral(amount: number): Promise<string> {
    if (!user) {
      throw new Error("User not authenticated")
    }

    try {
      // Use Turnkey to sign the deposit transaction
      // Note: This assumes Turnkey SDK supports Stacks signing - adjust as needed
      const txId = await depositStx(amount, user.walletAddress, process.env.ADMIN_PRIVATE_KEY!) // For now, using admin key; integrate proper signing
      console.log("[v0] Collateral deposited:", txId)
      return txId
    } catch (error) {
      console.error("[v0] Deposit failed:", error)
      throw error
    }
  }

  async function loginOrCreateWallet(userName: string): Promise<User> {
    try {
      setIsLoading(true)
      console.log("[v0] Attempting login or creating wallet for:", userName)

      // Try login first
      try {
        const loginResponse = await loginWithPasskey()
        const existingUser = getUser()

        if (existingUser && existingUser.subOrgId === loginResponse.organizationId) {
          setUser(existingUser)
          console.log("[v0] Login successful:", existingUser.walletAddress)
          return existingUser
        } else if (loginResponse.organizationId) {
          // This is a new user who already has a Turnkey account but no local storage
          // We need to create a local user object for them
          console.log("[v0] Existing Turnkey user without local storage, creating user object")
          
          // We would need to get their wallet info from Turnkey
          // For now, we'll create a minimal user object and let them know they need to create a wallet
          throw new Error("Existing Turnkey user detected. Please contact support or create a new wallet.")
        }
      } catch (loginError) {
        console.log("[v0] Login failed, creating new wallet for:", userName)
      }

      // If login fails or no existing user, create a new wallet
      return await createWalletWithPasskey(userName)
    } finally {
      setIsLoading(false)
    }
  }

  function logout() {
    setUser(null)
    clearUser()
    console.log("[v0] User logged out")
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        createWallet,
        login,
        loginOrCreateWallet,
        logout,
        depositCollateral,
        createWalletWithPasskey,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}