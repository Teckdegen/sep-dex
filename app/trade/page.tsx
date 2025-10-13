"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth/context"
import { useAllPrices } from "@/lib/price-feed/hooks"
import { checkLiquidations } from "@/lib/trading/position-manager"
import { Loader2, TrendingUp, BarChart3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TradingForm } from "@/components/trading/trading-form"
import { PriceCard } from "@/components/trading/price-card"
import { PriceChart } from "@/components/trading/price-chart"
import { AppLayout } from "@/components/layout/app-layout"
import type { SupportedAsset } from "@/lib/price-feed/types"

export default function TradePage() {
  const { user, isAuthenticated, isLoading, logout } = useAuth()
  const { prices, isLoading: pricesLoading, error: pricesError } = useAllPrices()
  const router = useRouter()
  const [selectedAsset, setSelectedAsset] = useState<SupportedAsset>("BTC")

  useEffect(() => {
    console.log("[v0] Trade page - auth state:", { user, isAuthenticated, isLoading })
    if (!isLoading && !isAuthenticated) {
      console.log("[v0] User not authenticated, redirecting to home")
      router.push("/")
    }
  }, [isAuthenticated, isLoading, router, user])

  // Add effect for checking liquidations every 30 seconds
  useEffect(() => {
    if (!user?.id || !prices) return;

    const checkForLiquidations = async () => {
      try {
        // Get admin private key from environment variables
        const adminPrivateKey = process.env.NEXT_PUBLIC_ADMIN_PRIVATE_KEY || '';
        
        // Check for liquidations (cast prices to the expected type)
        await checkLiquidations(user.id, prices as Record<string, number>, adminPrivateKey);
      } catch (error) {
        console.error("[v0] Error checking liquidations:", error);
      }
    };

    // Initial check
    checkForLiquidations();

    // Set up interval to check every 30 seconds
    const liquidationInterval = setInterval(checkForLiquidations, 30000);

    // Clean up interval on component unmount
    return () => clearInterval(liquidationInterval);
  }, [user, prices]);

  if (isLoading || !user) {
    console.log("[v0] Trade page - showing loading state")
    return (
      <AppLayout walletAddress={user?.walletAddress || ""}>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    )
  }

  console.log("[v0] Trade page - rendering content", { prices, pricesLoading, pricesError })

  return (
    <AppLayout walletAddress={user.walletAddress}>
      <div className="container mx-auto p-4">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground">Trading Dashboard</h2>
          <p className="text-muted-foreground">Open and manage your perpetual futures positions</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Prices and Chart */}
          <div className="space-y-6 lg:col-span-2">
            {/* Price Chart */}
            <div className="bg-card border border-border rounded-lg p-4 shadow">
              <div className="flex items-center justify-between mb-4">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                  <TrendingUp className="h-5 w-5" />
                  {selectedAsset} Price Chart
                </h2>
                <div className="text-right">
                  <div className="text-lg font-bold text-foreground">
                    {prices && prices[selectedAsset] ? `$${prices[selectedAsset].toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "Loading..."}
                  </div>
                </div>
              </div>
              <PriceChart symbol={selectedAsset} />
            </div>

            {/* Live Prices */}
            <div className="bg-card border border-border rounded-lg p-4 shadow">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
                <BarChart3 className="h-5 w-5" />
                Live Prices
              </h2>
              {pricesLoading ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : pricesError ? (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
                  Failed to load prices: {pricesError}
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {prices &&
                    Object.entries(prices).map(([symbol, price]) => (
                      <div 
                        key={symbol} 
                        onClick={() => setSelectedAsset(symbol as SupportedAsset)} 
                        className={`cursor-pointer rounded-lg border p-3 transition-all hover:shadow-md ${
                          selectedAsset === symbol 
                            ? "border-primary bg-primary/10" 
                            : "border-border bg-secondary/30 hover:bg-secondary/50"
                        }`}
                      >
                        <PriceCard symbol={symbol as any} price={price} />
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Trading Form */}
          <div>
            <div className="bg-card border border-border rounded-lg p-4 shadow sticky top-20">
              <h2 className="mb-4 text-lg font-semibold text-foreground">Open Position</h2>
              <TradingForm userId={user.id} />
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}