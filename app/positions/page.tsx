"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth/context"
import { usePositions } from "@/lib/trading/hooks"
import { Loader2, LogOut, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PositionCard } from "@/components/trading/position-card"
import { getStacksBalance } from "@/lib/blockchain/stacks"

export default function PositionsPage() {
  const { user, isAuthenticated, isLoading, logout } = useAuth()
  const { positions, isLoading: positionsLoading, error: positionsError } = usePositions()
  const router = useRouter()
  const [walletBalance, setWalletBalance] = useState<number>(0)
  const [isLoadingBalance, setIsLoadingBalance] = useState(true)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/")
    }
  }, [isAuthenticated, isLoading, router])

  useEffect(() => {
    if (user?.walletAddress) {
      loadWalletBalance()
      
      // Set up automatic balance refresh every 10 seconds
      const balanceInterval = setInterval(loadWalletBalance, 10000)
      
      // Clean up interval on component unmount
      return () => clearInterval(balanceInterval)
    }
  }, [user])

  async function loadWalletBalance() {
    if (!user?.walletAddress) return

    try {
      setIsLoadingBalance(true)
      const balance = await getStacksBalance(user.walletAddress)
      setWalletBalance(balance)
    } catch (error) {
      console.error("[v0] Failed to load wallet balance:", error)
    } finally {
      setIsLoadingBalance(false)
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
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center justify-between p-4">
          <h1 className="text-2xl font-bold text-foreground">SEP DEX - Positions</h1>
          <div className="flex items-center gap-4">
            <Button onClick={() => router.push("/trade")} variant="outline" size="sm">
              Trading
            </Button>
            <Button onClick={() => router.push("/charts")} variant="outline" size="sm">
              Charts
            </Button>
            <Button onClick={() => router.push("/wallet")} variant="outline" size="sm">
              <Wallet className="mr-2 h-4 w-4" />
              Wallet
            </Button>
            <div className="text-sm text-muted-foreground">
              <span className="text-foreground">
                {user.walletAddress.slice(0, 6)}...{user.walletAddress.slice(-4)}
              </span>
              <span className="ml-2">
                ({isLoadingBalance ? (
                  <Loader2 className="inline h-3 w-3 animate-spin" />
                ) : (
                  `${(walletBalance / 1_000_000).toFixed(2)} STX`
                )})
              </span>
            </div>
            <Button onClick={logout} variant="outline" size="sm">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto p-4">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-foreground">Open Positions</h2>
        </div>

        {positionsLoading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : positionsError ? (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            Failed to load positions: {positionsError}
          </div>
        ) : positions.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
            No open positions
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {positions.map((position) => (
              <PositionCard key={position.id} position={position} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}