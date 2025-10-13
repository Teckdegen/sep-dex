"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth/context"
import { useAllPrices } from "@/lib/price-feed/hooks"
import { Loader2, BarChart3, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { PriceChart } from "@/components/trading/price-chart"
import { AppLayout } from "@/components/layout/app-layout"
import type { SupportedAsset } from "@/lib/price-feed/types"

export default function ChartsPage() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const { prices, isLoading: pricesLoading, error: pricesError } = useAllPrices()
  const router = useRouter()
  const [selectedAsset, setSelectedAsset] = useState<SupportedAsset>("BTC")

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/")
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading || !user) {
    return (
      <AppLayout walletAddress={user?.walletAddress || ""}>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    )
  }

  const assets: SupportedAsset[] = ["BTC", "ETH", "STX", "SOL"]

  return (
    <AppLayout walletAddress={user.walletAddress}>
      <div className="container mx-auto p-4">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground">Market Charts</h2>
          <p className="text-muted-foreground">Real-time price charts and market data</p>
        </div>

        {/* Individual charts for all assets */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {assets.map((asset) => (
            <Card key={asset} className="border-border bg-card p-4 shadow">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-primary" />
                {asset} Price Chart
              </h3>
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
                  className={selectedAsset === asset ? "bg-primary hover:bg-primary/90" : "border-border hover:bg-secondary"}
                >
                  {asset}
                </Button>
              ))}
            </div>
          </div>
          <Card className="border-border bg-card p-4 shadow">
            <PriceChart symbol={selectedAsset} />
          </Card>
        </div>

        {/* Price overview */}
        <Card className="border-border bg-card p-4 shadow">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
            <BarChart3 className="h-5 w-5 mr-2 text-primary" />
            Current Prices
          </h3>
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
                      className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                        selectedAsset === asset 
                          ? "border-primary bg-primary/10" 
                          : "border-border hover:bg-muted"
                      }`}
                      onClick={() => setSelectedAsset(asset)}
                    >
                      <div className="text-sm font-medium text-foreground">{asset}</div>
                      <div className="text-lg font-bold text-foreground">${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </Card>
      </div>
    </AppLayout>
  )
}