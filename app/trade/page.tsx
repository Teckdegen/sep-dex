"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth/context"
import { useAllPrices } from "@/lib/price-feed/hooks"
import { Loader2, LogOut, Wallet, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TradingForm } from "@/components/trading/trading-form"
import { PriceCard } from "@/components/trading/price-card"
import { PriceChart } from "@/components/trading/price-chart"
import { getStacksBalance } from "@/lib/blockchain/stacks"
import type { SupportedAsset } from "@/lib/price-feed/types"

export default function TradePage() {
  const { user, isAuthenticated, isLoading, logout, getUserWalletBalance } = useAuth()
  const { prices, isLoading: pricesLoading, error: pricesError } = useAllPrices()
  const router = useRouter()
  const [selectedAsset, setSelectedAsset] = useState<SupportedAsset>("BTC")
  const [walletBalance, setWalletBalance] = useState<number>(0)
  const [isLoadingBalance, setIsLoadingBalance] = useState(true)

  useEffect(() => {
    console.log("[v0] Trade page - auth state:", { user, isAuthenticated, isLoading })
    if (!isLoading && !isAuthenticated) {
      console.log("[v0] User not authenticated, redirecting to home")
      router.push("/")
    }
  }, [isAuthenticated, isLoading, router, user])

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
    console.log("[v0] Trade page - showing loading state")
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  console.log("[v0] Trade page - rendering content", { prices, pricesLoading, pricesError })

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center justify-between p-4">
          <h1 className="text-2xl font-bold text-foreground">SEP DEX</h1>
          <div className="flex items-center gap-4">
            <Button onClick={() => router.push("/positions")} variant="outline" size="sm">
              Positions
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
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Prices and Chart */}
          <div className="space-y-6">
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Live Prices</h2>
              {pricesLoading ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : pricesError ? (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
                  Failed to load prices: {pricesError}
                </div>
              ) : (
                <div className="space-y-3">
                  {prices &&
                    Object.entries(prices).map(([symbol, price]) => (
                      <div key={symbol} onClick={() => setSelectedAsset(symbol as SupportedAsset)} className="cursor-pointer">
                        <PriceCard symbol={symbol as any} price={price} />
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Price Chart */}
            <div>
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
                <TrendingUp className="h-5 w-5" />
                {selectedAsset} Price Chart
              </h2>
              <PriceChart symbol={selectedAsset} />
            </div>
          </div>

          {/* Middle Column - Trading Form */}
          <div className="lg:col-span-2">
            <h2 className="mb-4 text-lg font-semibold text-foreground">Open Position</h2>
            <TradingForm userId={user.id} />
          </div>
        </div>
      </div>
    </div>
  )
}