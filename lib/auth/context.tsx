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

  async function createWallet(userName: string): Promise<User> {
    try {
      setIsLoading(true)
      console.log("[v0] Creating Turnkey wallet for:", userName)

      // Create sub-organization with passkey
      const subOrgResponse = await createUserSubOrg(userName)
      const subOrgId = subOrgResponse.subOrganizationId

      // Create Stacks wallet
      const walletResponse = await createStacksWallet(subOrgId, `${userName}-stacks-wallet`)
      const walletId = walletResponse.walletId
      const walletAddress = walletResponse.addresses[0] // First address

      // Save user to localStorage
      const newUser = await createUserInStorage(subOrgId, walletAddress, walletId)
      setUser(newUser)

      console.log("[v0] Turnkey wallet created successfully:", newUser.walletAddress)
      return newUser
    } catch (error) {
      console.error("[v0] Wallet creation failed:", error)
      throw error
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
      console.log("[v0] Attempting login for:", userName)

      // Try login first
      const loginResponse = await loginWithPasskey()
      const existingUser = getUser()

      if (existingUser && existingUser.subOrgId === loginResponse.organizationId) {
        setUser(existingUser)
        console.log("[v0] Login successful:", existingUser.walletAddress)
        return existingUser
      }

      throw new Error("Login failed, attempting wallet creation")
    } catch (loginError) {
      console.log("[v0] Login failed, creating wallet for:", userName)
      // If login fails, create wallet
      return await createWallet(userName)
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
