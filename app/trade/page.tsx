"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth/context"
import { useAllPrices } from "@/lib/price-feed/hooks"
import { checkLiquidations } from "@/lib/trading/position-manager"
import { Loader2, TrendingUp, BarChart3, Activity } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TradingForm } from "@/components/trading/trading-form"
import { PriceCard } from "@/components/trading/price-card"
import { PriceChart } from "@/components/trading/price-chart"
import { AppLayout } from "@/components/layout/app-layout"
import type { SupportedAsset } from "@/lib/price-feed/types"

export default function TradePage() {
  const { user, isAuthenticated, isLoading } = useAuth()
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

  if (isLoading || !user || !user.walletAddress) {
    console.log("[v0] Trade page - showing loading state")
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
          <p className="text-gray-300 text-lg">Loading Trading Interface...</p>
        </div>
      </div>
    )
  }

  console.log("[v0] Trade page - rendering content", { prices, pricesLoading, pricesError })

  return (
    <AppLayout walletAddress={user.walletAddress}>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="container mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold text-white mb-2 animate-pulse">Trading Terminal</h1>
                <p className="text-gray-400 text-lg">Execute perpetual futures trades with precision</p>
              </div>
              <Badge variant="outline" className="bg-green-600/10 border-green-500 text-green-400 px-4 py-2 animate-bounce">
                <Activity className="h-4 w-4 mr-2" />
                Live Market
              </Badge>
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            {/* Left Column - Prices and Chart */}
            <div className="space-y-8 lg:col-span-2">
              {/* Price Chart */}
              <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700 shadow-2xl">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-3 text-xl font-semibold text-white">
                    <TrendingUp className="h-6 w-6 text-blue-500" />
                    {selectedAsset} Price Chart
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {/* Market Indicator */}
                  <div className="mb-6 p-4 bg-gray-700/50 rounded-lg border border-gray-600 hover:bg-gray-600/50 transition-all duration-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-400">Current Price</p>
                        <div className="text-3xl font-bold text-green-400 animate-pulse">
                          {prices && prices[selectedAsset] ? `$${prices[selectedAsset].toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "Loading..."}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-400">24h Change</p>
                        <div className="text-lg font-semibold text-green-400 animate-bounce">+2.45%</div>
                      </div>
                    </div>
                  </div>
                  <PriceChart symbol={selectedAsset} />
                </CardContent>
              </Card>

              {/* Live Prices */}
              <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700 shadow-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-xl font-semibold text-white">
                    <BarChart3 className="h-6 w-6 text-blue-500" />
                    Live Market Prices
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Click to select asset for detailed view
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {pricesLoading ? (
                    <div className="flex justify-center p-12">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                    </div>
                  ) : pricesError ? (
                    <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-6 text-center">
                      <p className="text-red-400 font-medium">Failed to load prices</p>
                      <p className="text-sm text-red-300 mt-2">{pricesError}</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                      {prices &&
                        Object.entries(prices).map(([symbol, price]) => (
                          <Card
                            key={symbol}
                            onClick={() => setSelectedAsset(symbol as SupportedAsset)}
                            className={`cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/20 ${
                              selectedAsset === symbol
                                ? "border-blue-500 bg-blue-500/10 shadow-blue-500/20 animate-pulse"
                                : "border-gray-600 bg-gray-700/50 hover:bg-gray-700/70"
                            }`}
                          >
                            <CardContent className="p-4">
                              <PriceCard symbol={symbol as any} price={price} />
                            </CardContent>
                          </Card>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Trading Form */}
            <div>
              <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700 shadow-2xl sticky top-6 hover:shadow-3xl transition-all duration-200">
                <CardHeader>
                  <CardTitle className="text-xl font-semibold text-white animate-bounce">Open Position</CardTitle>
                  <CardDescription className="text-gray-400">
                    Configure your trade parameters below
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <TradingForm userId={user.id} />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}