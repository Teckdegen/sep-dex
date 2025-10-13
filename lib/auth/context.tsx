"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { getUser, clearUser, type User } from "../storage/local-storage"
import { createUserSubOrg, createStacksWallet, loginWithPasskey, createUserInStorage, createLocalWallet, importLocalWallet, getLocalWalletPrivateKey, getTurnkeyWalletPrivateKey } from "../turnkey/service"
import { depositStx } from "../stacks-client" // Import Stacks client
import { getStacksBalance } from "../blockchain/stacks"

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
  createLocalWallet: (userName: string) => Promise<User> // Local wallet creation
  importExistingWallet: (userName: string, privateKey: string) => Promise<User> // Import existing wallet
  getUserWalletBalance: () => Promise<number> // Get user's wallet balance
  getUserPrivateKey: () => string // Get user's private key
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
      console.log("[v0] Auth check - existing user:", existingUser)

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
      // Check if this is a local wallet
      const isLocalWallet = user.subOrgId === "local-wallet"
      let privateKey: string

      if (isLocalWallet) {
        // For local wallets, get the private key from localStorage
        const localPrivateKey = getLocalWalletPrivateKey()
        if (localPrivateKey) {
          // Ensure private key has the correct format for Stacks
          // Remove 0x prefix if it exists, then add it back to ensure consistency
          const cleanKey = localPrivateKey.startsWith('0x') ? localPrivateKey.slice(2) : localPrivateKey
          privateKey = `0x${cleanKey}`
        } else {
          throw new Error("Local wallet private key not found")
        }
      } else {
        // For Turnkey wallets, get the private key from Turnkey service
        // In a real implementation, this would use Turnkey's signing API
        const turnkeyPrivateKey = getTurnkeyWalletPrivateKey()
        if (turnkeyPrivateKey) {
          // Ensure private key has the correct format for Stacks
          // Remove 0x prefix if it exists, then add it back to ensure consistency
          const cleanKey = turnkeyPrivateKey.startsWith('0x') ? turnkeyPrivateKey.slice(2) : turnkeyPrivateKey
          privateKey = `0x${cleanKey}`
        } else {
          throw new Error("Turnkey wallet private key not found")
        }
      }

      console.log("[v0] Using private key for deposit:", privateKey.substring(0, 10) + "...") // Log first 10 chars for debugging

      // Use user's private key to sign the deposit transaction
      // Amount is already in STX, convert to microSTX
      const microStxAmount = Math.floor(amount * 1_000_000)
      const txId = await depositStx(microStxAmount, user.walletAddress, privateKey)
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
          // This is an existing Turnkey user without local storage
          // We need to create a local user object for them
          console.log("[v0] Existing Turnkey user without local storage, creating user object")
          
          // Create a minimal user object based on the login response
          // In a real implementation, we would fetch the wallet details from Turnkey
          // For now, we'll redirect them to create a proper wallet
          throw new Error("Please create a wallet to continue")
        }
      } catch (loginError) {
        console.log("[v0] Login failed or user not found, will create new wallet for:", userName)
      }

      // If login fails or no existing user, create a new wallet
      // But first check if user already has a local wallet
      const existingLocalUser = getUser()
      if (existingLocalUser && existingLocalUser.subOrgId === "local-wallet") {
        setUser(existingLocalUser)
        console.log("[v0] Using existing local wallet:", existingLocalUser.walletAddress)
        return existingLocalUser
      }

      return await createWalletWithPasskey(userName || "User")
    } finally {
      setIsLoading(false)
    }
  }

  // Create local wallet and update auth state
  async function createLocalWalletAndSetUser(userName: string): Promise<User> {
    try {
      setIsLoading(true)
      console.log("[v0] Creating local wallet for user:", userName)
      const newUser = await createLocalWallet(userName)
      setUser(newUser)
      console.log("[v0] Local wallet created and user set:", newUser.walletAddress)
      return newUser
    } catch (error) {
      console.error("[v0] Local wallet creation failed:", error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  // Import existing local wallet and update auth state
  async function importLocalWalletAndSetUser(userName: string, privateKey: string): Promise<User> {
    try {
      setIsLoading(true)
      console.log("[v0] Importing local wallet for user:", userName)
      const newUser = await importLocalWallet(userName, privateKey)
      setUser(newUser)
      console.log("[v0] Local wallet imported and user set:", newUser.walletAddress)
      return newUser
    } catch (error) {
      console.error("[v0] Local wallet import failed:", error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  // Get user's wallet balance
  async function getUserWalletBalance(): Promise<number> {
    if (!user?.walletAddress) {
      return 0
    }

    try {
      const balance = await getStacksBalance(user.walletAddress)
      return balance
    } catch (error) {
      console.error("[v0] Failed to get user wallet balance:", error)
      return 0
    }
  }

  // Get user's private key
  function getUserPrivateKey(): string {
    if (!user) {
      throw new Error("User not authenticated")
    }

    // Check if this is a local wallet
    const isLocalWallet = user.subOrgId === "local-wallet"

    if (isLocalWallet) {
      // For local wallets, get the private key from localStorage
      const localPrivateKey = getLocalWalletPrivateKey()
      if (localPrivateKey) {
        // Ensure private key has the correct format for Stacks (0x prefixed)
        return localPrivateKey.startsWith('0x') ? localPrivateKey : `0x${localPrivateKey}`
      } else {
        throw new Error("Local wallet private key not found")
      }
    } else {
      // For Turnkey wallets, get the private key from Turnkey service
      const turnkeyPrivateKey = getTurnkeyWalletPrivateKey()
      if (turnkeyPrivateKey) {
        // Ensure private key has the correct format for Stacks (0x prefixed)
        return turnkeyPrivateKey.startsWith('0x') ? turnkeyPrivateKey : `0x${turnkeyPrivateKey}`
      } else {
        throw new Error("Turnkey wallet private key not found")
      }
    }
  }

  function logout() {
    // Clear all user-related data from localStorage
    localStorage.removeItem('local-wallet-private-key')
    localStorage.removeItem('local-wallet-public-key')
    localStorage.removeItem('local-wallet-address')
    localStorage.removeItem('local-wallet-username')
    localStorage.removeItem('turnkey-wallet-private-key')
    localStorage.removeItem('sep-dex-user')
    localStorage.removeItem('sep-dex-positions')
    localStorage.removeItem('sep-dex-transactions')
    
    setUser(null)
    console.log("[v0] User logged out and all data cleared")
  }

  console.log("[v0] AuthProvider state:", { user, isLoading, isAuthenticated: !!user })

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
        createLocalWallet: createLocalWalletAndSetUser,
        importExistingWallet: importLocalWalletAndSetUser,
        getUserWalletBalance,
        getUserPrivateKey,
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