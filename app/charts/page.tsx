"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth/context"
import { useAllPrices } from "@/lib/price-feed/hooks"
import { Loader2, Wallet, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { PriceChart } from "@/components/trading/price-chart"
import { getStacksBalance } from "@/lib/blockchain/stacks"
import type { SupportedAsset } from "@/lib/price-feed/types"

export default function ChartsPage() {
  const { user, isAuthenticated, isLoading, logout } = useAuth()
  const { prices, isLoading: pricesLoading, error: pricesError } = useAllPrices()
  const router = useRouter()
  const [selectedAsset, setSelectedAsset] = useState<SupportedAsset>("BTC")
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

  const assets: SupportedAsset[] = ["BTC", "ETH", "STX", "SOL"]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center justify-between p-4">
          <h1 className="text-2xl font-bold text-foreground">SEP DEX - Charts</h1>
          <div className="flex items-center gap-4">
            <Button onClick={() => router.push("/trade")} variant="outline" size="sm">
              Trading
            </Button>
            <Button onClick={() => router.push("/wallet")} variant="outline" size="sm">
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
          <h2 className="text-xl font-semibold text-foreground mb-4">Asset Price Charts</h2>
        </div>

        {/* Individual charts for all assets */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {assets.map((asset) => (
            <Card key={asset} className="border-border bg-card p-4">
              <h3 className="text-lg font-semibold text-foreground mb-4">{asset} Price Chart</h3>
              <PriceChart symbol={asset} />
            </Card>
          ))}
        </div>

        {/* Selected asset detailed view */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-foreground">Detailed View: {selectedAsset}</h2>
            <div className="flex gap-2">
              {assets.map((asset) => (
                <Button
                  key={asset}
                  variant={selectedAsset === asset ? "default" : "outline"}
                  onClick={() => setSelectedAsset(asset)}
                  size="sm"
                >
                  {asset}
                </Button>
              ))}
            </div>
          </div>
          <Card className="border-border bg-card p-4">
            <PriceChart symbol={selectedAsset} />
          </Card>
        </div>

        {/* Price overview */}
        <Card className="border-border bg-card p-4">
          <h3 className="text-lg font-semibold text-foreground mb-4">Current Prices</h3>
          <div className="space-y-4">
            {pricesLoading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : pricesError ? (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
                Failed to load prices: {pricesError}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {assets.map((asset) => {
                  const price = prices?.[asset] || 0
                  return (
                    <div 
                      key={asset} 
                      className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                        selectedAsset === asset 
                          ? "border-primary bg-primary/10" 
                          : "border-border hover:bg-muted"
                      }`}
                      onClick={() => setSelectedAsset(asset)}
                    >
                      <div className="text-sm text-muted-foreground">{asset}</div>
                      <div className="text-lg font-semibold text-foreground">${price.toFixed(2)}</div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}