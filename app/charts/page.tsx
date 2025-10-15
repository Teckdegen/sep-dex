"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth/context"
import { useAllPrices } from "@/lib/price-feed/hooks"
import { Loader2, BarChart3, TrendingUp, Activity, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
            <p className="text-gray-300 text-lg">Loading Market Charts...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  const assets: SupportedAsset[] = ["BTC", "ETH", "STX", "SOL"]

  return (
    <AppLayout walletAddress={user.walletAddress}>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="container mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold text-white mb-2">Market Analytics</h1>
                <p className="text-gray-400 text-lg">Real-time price charts and comprehensive market data</p>
              </div>
              <Badge variant="outline" className="bg-blue-500/10 border-blue-500 text-blue-400 px-4 py-2">
                <Eye className="h-4 w-4 mr-2" />
                Live Data
              </Badge>
            </div>
          </div>

          {/* Asset Selector */}
          <div className="mb-8">
            <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700 shadow-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl font-semibold text-white">
                  <BarChart3 className="h-6 w-6 text-blue-500" />
                  Select Asset for Detailed View
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Choose an asset to view its price chart and detailed analytics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {assets.map((asset) => (
                    <Button
                      key={asset}
                      onClick={() => setSelectedAsset(asset)}
                      variant={selectedAsset === asset ? "default" : "outline"}
                      className={`h-16 flex-col gap-2 ${
                        selectedAsset === asset
                          ? "bg-blue-600 hover:bg-blue-700"
                          : "border-gray-600 hover:bg-gray-700"
                      }`}
                    >
                      <span className="font-bold text-lg">{asset}</span>
                      {prices && prices[asset] && (
                        <span className="text-sm">
                          ${prices[asset].toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      )}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Chart */}
          <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700 shadow-2xl mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl font-semibold text-white">
                <TrendingUp className="h-6 w-6 text-blue-500" />
                {selectedAsset} Price Chart
              </CardTitle>
              <CardDescription className="text-gray-400">
                Real-time price movements and historical data
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pricesLoading ? (
                <div className="flex justify-center p-12">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                </div>
              ) : pricesError ? (
                <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-6 text-center">
                  <p className="text-red-400 font-medium">Failed to load price data</p>
                  <p className="text-sm text-red-300 mt-2">{pricesError}</p>
                </div>
              ) : (
                <PriceChart symbol={selectedAsset} />
              )}
            </CardContent>
          </Card>

          {/* Individual Asset Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {assets.map((asset) => (
              <Card key={asset} className="bg-gray-800/50 backdrop-blur-sm border-gray-700 shadow-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-lg font-semibold text-white">
                    <Activity className="h-6 w-6 text-blue-500" />
                    {asset} Chart
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Price movements for {asset}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <PriceChart symbol={asset} />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}