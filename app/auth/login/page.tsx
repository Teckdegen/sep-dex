"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth/context"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Wallet, Key } from "lucide-react"

export default function LoginPage() {
  const [userName, setUserName] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { createWalletWithPasskey, loginOrCreateWallet } = useAuth()
  const router = useRouter()

  const handleCreateWallet = async () => {
    if (!userName.trim()) {
      setError("Please enter a username")
      return
    }

    try {
      setIsCreating(true)
      setError(null)
      console.log("[v0] Creating Turnkey wallet with passkey for:", userName)
      // Ensure this is called directly from user interaction
      await createWalletWithPasskey(userName)
      router.push("/trade")
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
      // Ensure this is called directly from user interaction
      await loginOrCreateWallet(userName)
      router.push("/trade")
    } catch (err) {
      console.error("[v0] Login error:", err)
      setError(err instanceof Error ? err.message : "Failed to login")
    } finally {
      setIsLoggingIn(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
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
                    // Ensure this is called directly from user interaction
                    handleCreateWallet()
                  }
                }}
              />
            </div>

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
                  Creating Wallet...
                </>
              ) : (
                <>
                  <Wallet className="mr-2 h-4 w-4" />
                  Create New Wallet
                </>
              )}
            </Button>
          </div>

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

          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="rounded-lg border border-border bg-muted/50 p-4 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">Turnkey Security:</p>
            <p className="mt-1">
              Your wallet is secured with passkey authentication. No passwords needed - just use your device's biometric
              authentication.
            </p>
            <p className="mt-1">
              • "Create New Wallet" - Register a new wallet with a new passkey
              <br />
              • "Use Passkey" - Use an existing passkey or automatically create a new one
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}