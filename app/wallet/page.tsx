"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth/context"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Loader2, Wallet, Copy, Check } from "lucide-react"
import { getStacksBalance } from "@/lib/blockchain/stacks"

export default function WalletPage() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const [balance, setBalance] = useState<number>(0)
  const [isLoadingBalance, setIsLoadingBalance] = useState(true)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/auth/login")
    }
  }, [isAuthenticated, isLoading, router])

  useEffect(() => {
    if (user?.walletAddress) {
      loadBalance()
    }
  }, [user])

  async function loadBalance() {
    if (!user?.walletAddress) return

    try {
      setIsLoadingBalance(true)
      const stacksBalance = await getStacksBalance(user.walletAddress)
      setBalance(stacksBalance)
    } catch (error) {
      console.error("[v0] Failed to load balance:", error)
      setError(error instanceof Error ? error.message : "Failed to load balance")
    } finally {
      setIsLoadingBalance(false)
    }
  }

  function copyAddress() {
    if (user?.walletAddress) {
      navigator.clipboard.writeText(user.walletAddress)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-foreground">Wallet</h1>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => router.push("/positions")}>
                Positions
              </Button>
              <Button variant="outline" onClick={() => router.push("/charts")}>
                Charts
              </Button>
              <Button variant="outline" onClick={() => router.push("/trade")}>
                Go to Trading
              </Button>
            </div>
          </div>

          <Card className="border-border bg-card p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold text-foreground">Wallet Address</h2>
              </div>

              <div className="flex items-center gap-2 rounded-lg bg-muted p-3">
                <code className="flex-1 text-sm text-foreground">{user.walletAddress}</code>
                <Button size="sm" variant="ghost" onClick={copyAddress}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>

              <div className="rounded-lg border border-border bg-muted/50 p-4">
                <p className="text-sm text-muted-foreground">Available Balance</p>
                <p className="text-3xl font-bold text-foreground">
                  {isLoadingBalance ? (
                    <Loader2 className="h-8 w-8 animate-spin" />
                  ) : (
                    `${(balance / 1_000_000).toFixed(2)} STX`
                  )}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  This is your actual wallet balance. You can trade directly from this balance.
                </p>
              </div>
            </div>
          </Card>

          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
