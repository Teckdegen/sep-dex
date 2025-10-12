"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth/context"
import { useAllPrices } from "@/lib/price-feed/hooks"
import { usePositions } from "@/lib/trading/hooks"
import { Loader2, LogOut, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TradingForm } from "@/components/trading/trading-form"
import { PositionCard } from "@/components/trading/position-card"
import { PriceCard } from "@/components/trading/price-card"

export default function TradePage() {
  const { user, isAuthenticated, isLoading, logout } = useAuth()
  const { prices, isLoading: pricesLoading } = useAllPrices()
  const { positions, isLoading: positionsLoading } = usePositions()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/")
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center justify-between p-4">
          <h1 className="text-2xl font-bold text-foreground">SEP DEX</h1>
          <div className="flex items-center gap-4">
            <Button onClick={() => router.push("/wallet")} variant="outline" size="sm">
              <Wallet className="mr-2 h-4 w-4" />
              Wallet
            </Button>
            <div className="text-sm text-muted-foreground">
              <span className="text-foreground">
                {user.walletAddress.slice(0, 6)}...{user.walletAddress.slice(-4)}
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
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Prices */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Live Prices</h2>
            {pricesLoading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-3">
                {prices &&
                  Object.entries(prices).map(([symbol, price]) => (
                    <PriceCard key={symbol} symbol={symbol as any} price={price} />
                  ))}
              </div>
            )}
          </div>

          {/* Middle Column - Trading Form */}
          <div>
            <h2 className="mb-4 text-lg font-semibold text-foreground">Open Position</h2>
            <TradingForm userId={user.id} />
          </div>

          {/* Right Column - Positions */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Open Positions</h2>
            {positionsLoading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : positions.length === 0 ? (
              <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
                No open positions
              </div>
            ) : (
              <div className="space-y-3">
                {positions.map((position) => (
                  <PositionCard key={position.id} position={position} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
