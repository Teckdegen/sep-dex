"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth/context"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, Wallet, Key, Lock, Import } from "lucide-react"
import { useTurnkey } from "@turnkey/sdk-react"
import { createSubOrganization } from "../../actions"

export default function LoginPage() {
  const [userName, setUserName] = useState("")
  const [email, setEmail] = useState("")
  const [useLocalWallet, setUseLocalWallet] = useState(false)
  const [importWallet, setImportWallet] = useState(false)
  const [privateKey, setPrivateKey] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { createLocalWallet, importExistingWallet } = useAuth()
  const { passkeyClient, indexedDbClient } = useTurnkey()
  const router = useRouter()

  const handleCreateWallet = async () => {
    if (!userName.trim()) {
      setError("Please enter a username")
      return
    }

    if (!useLocalWallet && !importWallet && !email.trim()) {
      setError("Please enter an email address for passkey creation")
      return
    }

    try {
      setIsCreating(true)
      setError(null)

      if (importWallet) {
        // Import existing wallet with private key
        if (!privateKey.trim()) {
          throw new Error("Please enter a private key to import")
        }
        console.log("[v0] Importing existing wallet for:", userName)
        await importExistingWallet(userName, privateKey)
        router.push("/trade")
      } else if (useLocalWallet) {
        // Create a local wallet without Turnkey
        console.log("[v0] Creating local Stacks wallet for:", userName)
        await createLocalWallet(userName)
        router.push("/trade")
      } else {
        // Use Turnkey with email-based passkey creation
        console.log("[v0] Creating Turnkey wallet with email passkey for:", userName)
        console.log("[v0] Current domain:", typeof window !== 'undefined' ? window.location.hostname : 'unknown')

        // Initialize IndexedDB client for session management
        if (!indexedDbClient) {
          throw new Error("IndexedDB client not available - check TurnkeyProvider setup")
        }

        console.log("[v0] Initializing IndexedDB client...")
        await indexedDbClient.init()
        const publicKey = await indexedDbClient.getPublicKey()

        if (!publicKey) {
          throw new Error("Failed to get public key from IndexedDB client")
        }

        console.log("[v0] Got public key, length:", publicKey.length)

        // Create passkey first
        if (!passkeyClient) {
          throw new Error("Passkey client not available")
        }

        console.log("[v0] Creating passkey credential...")
        const passkeyCredential = await passkeyClient.createUserPasskey({
          publicKey: {
            rp: {
              name: "SEP DEX Wallet",
            },
            user: {
              name: userName,
              displayName: userName,
            },
          },
        })

        if (!passkeyCredential) {
          throw new Error("Failed to create passkey")
        }

        console.log("[v0] Passkey created, logging in...")

        // Login with passkey to create session
        await passkeyClient.loginWithPasskey({
          publicKey,
          sessionType: "SESSION_TYPE_READ_WRITE",
          expirationSeconds: 900,
        })

        console.log("[v0] Session created, creating sub-organization...")

        // Create sub-organization with the passkey
        const subOrgResponse = await createSubOrganization(
          userName,
          email,
          passkeyCredential.encodedChallenge,
          {
            credentialId: passkeyCredential.credentialId,
            clientDataJson: passkeyCredential.clientDataJson,
            attestationObject: passkeyCredential.attestationObject,
            transports: passkeyCredential.transports || [],
          }
        )

        console.log("[v0] Sub-organization created:", subOrgResponse)

        // For now, redirect to trade page - in a real implementation,
        // you'd want to store the sub-organization details and wallet address
        router.push("/trade")
      }
    } catch (err) {
      console.error("[v0] Wallet creation error:", err)
      setError(err instanceof Error ? err.message : "Failed to create wallet")
    } finally {
      setIsCreating(false)
    }
  }

  const handleLogin = async () => {
    try {
      setIsLoggingIn(true)
      setError(null)
      console.log("[v0] Attempting passkey login")
      console.log("[v0] Current domain:", typeof window !== 'undefined' ? window.location.hostname : 'unknown')

      // Initialize IndexedDB client for session management
      if (!indexedDbClient) {
        throw new Error("IndexedDB client not available - check TurnkeyProvider setup")
      }

      console.log("[v0] Initializing IndexedDB client...")
      await indexedDbClient.init()
      const publicKey = await indexedDbClient.getPublicKey()

      if (!publicKey) {
        throw new Error("Failed to get public key from IndexedDB client")
      }

      console.log("[v0] Got public key, length:", publicKey.length)

      // Login with existing passkey
      if (!passkeyClient) {
        throw new Error("Passkey client not available")
      }

      console.log("[v0] Logging in with passkey...")
      await passkeyClient.loginWithPasskey({
        publicKey,
        sessionType: "SESSION_TYPE_READ_WRITE",
        expirationSeconds: 900,
      })

      console.log("[v0] Passkey login successful")
      router.push("/trade")
    } catch (err) {
      console.error("[v0] Login error:", err)
      setError(err instanceof Error ? err.message : "Failed to login")
    } finally {
      setIsLoggingIn(false)
    }
  }

  // Function to derive address from private key (for display purposes)
  const deriveAddressFromPrivateKey = (pk: string) => {
    try {
      // Validate private key format
      let formattedPrivateKey = pk.trim();

      // Remove 0x prefix if present
      if (formattedPrivateKey.startsWith('0x')) {
        formattedPrivateKey = formattedPrivateKey.slice(2);
      }

      // Ensure it's a valid 64-character hex string
      if (!/^[0-9a-fA-F]{64}$/.test(formattedPrivateKey)) {
        return "Invalid private key format";
      }

      const { getAddressFromPrivateKey } = require('@stacks/transactions')
      // Use private key without 0x prefix
      return getAddressFromPrivateKey(formattedPrivateKey, 'testnet')
    } catch (error) {
      return "Invalid private key"
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-border bg-card p-8">
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <div className="rounded-full bg-primary/10 p-4">
              <Wallet className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="mb-2 text-3xl font-bold text-foreground">SEP DEX</h1>
          <p className="text-sm text-muted-foreground">Secure wallet authentication with Turnkey passkeys</p>
        </div>

        <div className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-foreground">
                Username
              </Label>
              <Input
                id="username"
                placeholder="Enter your username"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                disabled={isCreating || isLoggingIn}
                className="bg-input text-foreground"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isCreating && !isLoggingIn) {
                    handleCreateWallet()
                  }
                }}
              />
            </div>

            {!useLocalWallet && !importWallet && (
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isCreating || isLoggingIn}
                  className="bg-input text-foreground"
                />
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Checkbox
                id="local-wallet"
                checked={useLocalWallet}
                onCheckedChange={(checked) => {
                  setUseLocalWallet(checked as boolean)
                  if (checked) setImportWallet(false)
                }}
              />
              <Label
                htmlFor="local-wallet"
                className="text-foreground text-sm cursor-pointer"
              >
                Use local wallet (no Turnkey)
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="import-wallet"
                checked={importWallet}
                onCheckedChange={(checked) => {
                  setImportWallet(checked as boolean)
                  if (checked) setUseLocalWallet(false)
                }}
              />
              <Label
                htmlFor="import-wallet"
                className="text-foreground text-sm cursor-pointer"
              >
                Import existing wallet
              </Label>
            </div>

            {importWallet && (
              <div className="space-y-2">
                <Label htmlFor="private-key" className="text-foreground">
                  Private Key
                </Label>
                <Input
                  id="private-key"
                  type="password"
                  placeholder="Enter your private key"
                  value={privateKey}
                  onChange={(e) => setPrivateKey(e.target.value)}
                  disabled={isCreating || isLoggingIn}
                  className="bg-input text-foreground"
                />
                {privateKey && (
                  <div className="text-xs text-muted-foreground">
                    <p>Derived address: {deriveAddressFromPrivateKey(privateKey)}</p>
                  </div>
                )}
              </div>
            )}

            <Button
              onClick={handleCreateWallet}
              disabled={isCreating || isLoggingIn}
              className="w-full"
              size="lg"
              type="button"
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {importWallet ? "Importing Wallet..." : useLocalWallet ? "Creating Local Wallet..." : "Creating Wallet..."}
                </>
              ) : (
                <>
                  {importWallet ? <Import className="mr-2 h-4 w-4" /> : <Wallet className="mr-2 h-4 w-4" />}
                  {importWallet ? "Import Wallet" : useLocalWallet ? "Create Local Wallet" : "Create New Wallet"}
                </>
              )}
            </Button>
          </div>

          {!useLocalWallet && !importWallet && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or</span>
                </div>
              </div>

              <Button
                onClick={handleLogin}
                disabled={isCreating || isLoggingIn}
                variant="outline"
                className="w-full bg-transparent"
                size="lg"
                type="button"
              >
                {isLoggingIn ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Using Passkey...
                  </>
                ) : (
                  <>
                    <Key className="mr-2 h-4 w-4" />
                    Use Passkey (Existing/New)
                  </>
                )}
              </Button>
            </>
          )}

          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="rounded-lg border border-border bg-muted/50 p-4 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">Wallet Options:</p>
            <p className="mt-1">
              {importWallet ? (
                <>
                  <Import className="inline h-3 w-3 mr-1" />
                  Import wallet: Use an existing wallet with your private key
                </>
              ) : useLocalWallet ? (
                <>
                  <Lock className="inline h-3 w-3 mr-1" />
                  Local wallet: Private key stored in browser. Backup your private key!
                </>
              ) : (
                <>
                  <Key className="inline h-3 w-3 mr-1" />
                  Turnkey wallet: Secure passkey authentication with biometrics and email recovery
                </>
              )}
            </p>
            <p className="mt-1">
              {importWallet ? (
                "Import an existing wallet using your private key. The address will be derived automatically."
              ) : useLocalWallet ? (
                "⚠️ Private key will be stored in browser storage. Export and backup your private key for security."
              ) : (
                "• \"Create New Wallet\" - Register a new wallet with email and passkey\n" +
                "• \"Use Passkey\" - Login with existing passkey or create a new one"
              )}
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}