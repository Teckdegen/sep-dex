"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth/context"
import { usePositions } from "@/lib/trading/hooks"
import { checkLiquidations } from "@/lib/trading/position-manager"
import { useAllPrices } from "@/lib/price-feed/hooks"
import { Loader2, BarChart3, TrendingUp, TrendingDown, Activity, DollarSign, Target } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PositionCard } from "@/components/trading/position-card"
import { AppLayout } from "@/components/layout/app-layout"
import type { SupportedAsset } from "@/lib/price-feed/types"

export default function PositionsPage() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const { positions, isLoading: positionsLoading, error: positionsError } = usePositions()
  const { prices, isLoading: pricesLoading, error: pricesError } = useAllPrices()
  const router = useRouter()
  const [totalPnL, setTotalPnL] = useState<number>(0)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/")
    }
  }, [isAuthenticated, isLoading, router])

  // Add effect for checking liquidations every 30 seconds
  useEffect(() => {
    if (!user?.id || !prices) return;

    const checkForLiquidations = async () => {
      try {
        // Get admin private key from environment variables
        const adminPrivateKey = process.env.NEXT_PUBLIC_ADMIN_PRIVATE_KEY || '';

        // Check for liquidations
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

  // Calculate total PnL
  useEffect(() => {
    if (positions && prices) {
      let total = 0;
      positions.forEach(position => {
        if (position.status === "open" && prices[position.symbol as SupportedAsset]) {
          const currentPrice = prices[position.symbol as SupportedAsset] as number;
          const isLong = position.side === "long";
          const priceDiff = isLong ? currentPrice - position.entry_price : position.entry_price - currentPrice;
          // PnL = size * priceDiff (since size = (collateral * leverage) / entry_price)
          const pnl = position.size * priceDiff;
          total += pnl;
        }
      });
      setTotalPnL(total);
    }
  }, [positions, prices]);

  if (isLoading || !user || !user.walletAddress) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
          <p className="text-gray-300 text-lg">Loading Positions...</p>
        </div>
      </div>
    )
  }

  const openPositions = positions.filter(pos => pos.status === "open");
  const closedPositions = positions.filter(pos => pos.status !== "open");

  return (
    <AppLayout walletAddress={user.walletAddress}>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="container mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold text-white mb-2 animate-pulse">Positions Dashboard</h1>
                <p className="text-gray-400 text-lg">Monitor and manage your trading positions</p>
              </div>
              <Button onClick={() => router.push("/trade")} className="bg-blue-600 hover:bg-blue-700 hover:scale-105 transition-all duration-200 animate-bounce">
                <Target className="mr-2 h-5 w-5" />
                Open New Position
              </Button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700 shadow-2xl hover:shadow-3xl hover:scale-105 transition-all duration-200">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-lg font-semibold text-white">
                  <BarChart3 className="h-6 w-6 text-blue-500 animate-bounce" />
                  Open Positions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-400 animate-pulse">{openPositions.length}</div>
                <p className="text-sm text-gray-500 mt-2">Active trades</p>
              </CardContent>
            </Card>

            <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700 shadow-2xl hover:shadow-3xl hover:scale-105 transition-all duration-200">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-lg font-semibold text-white">
                  <DollarSign className={`h-6 w-6 ${totalPnL >= 0 ? "text-green-500 animate-bounce" : "text-red-500"}`} />
                  Total PnL
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${totalPnL >= 0 ? "text-green-400 animate-pulse" : "text-red-400"}`}>
                  {totalPnL >= 0 ? "+" : ""}${Math.abs(totalPnL).toFixed(2)}
                </div>
                <p className="text-sm text-gray-500 mt-2">Unrealized gains/losses</p>
              </CardContent>
            </Card>

            <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700 shadow-2xl hover:shadow-3xl hover:scale-105 transition-all duration-200">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-lg font-semibold text-white">
                  <Activity className="h-6 w-6 text-blue-500 animate-bounce" />
                  Portfolio Value
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white animate-pulse">$0.00</div>
                <p className="text-sm text-gray-500 mt-2">Total portfolio value</p>
              </CardContent>
            </Card>
          </div>

          {/* Positions Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Open Positions</h2>
              <Badge variant="outline" className="bg-blue-500/10 border-blue-500 text-blue-400">
                {openPositions.length} Active
              </Badge>
            </div>

            {positionsLoading || pricesLoading ? (
              <div className="flex justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            ) : positionsError || pricesError ? (
              <Card className="bg-red-500/10 border-red-500/50">
                <CardContent className="p-6 text-center">
                  <p className="text-red-400 font-medium">Failed to load positions</p>
                  <p className="text-sm text-red-300 mt-2">{positionsError || pricesError}</p>
                </CardContent>
              </Card>
            ) : openPositions.length === 0 ? (
              <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700 shadow-2xl hover:shadow-3xl transition-all duration-200">
                <CardContent className="p-8 text-center">
                  <BarChart3 className="h-16 w-16 text-gray-500 mx-auto mb-4 animate-bounce" />
                  <h3 className="text-xl font-semibold text-white mb-2">No Open Positions</h3>
                  <p className="text-gray-400 mb-4">You don't have any active positions. Start trading to open one!</p>
                  <Button onClick={() => router.push("/trade")} className="bg-blue-600 hover:bg-blue-700 hover:scale-105 transition-all duration-200 animate-pulse">
                    Open Your First Position
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {openPositions.map((position) => (
                  <Card key={position.id} className="bg-gray-800/50 backdrop-blur-sm border-gray-700 shadow-2xl hover:shadow-3xl transition-all duration-200 animate-pulse">
                    <CardContent className="p-6">
                      <PositionCard position={position} />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Closed Positions Section */}
          {closedPositions.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Closed Positions</h2>
                <Badge variant="outline" className="bg-gray-500/10 border-gray-500 text-gray-400">
                  {closedPositions.length} Completed
                </Badge>
              </div>
              <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700 shadow-2xl">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-700/50">
                        <tr>
                          <th className="text-left p-4 text-sm font-medium text-gray-300">Asset</th>
                          <th className="text-left p-4 text-sm font-medium text-gray-300">Type</th>
                          <th className="text-left p-4 text-sm font-medium text-gray-300">Entry</th>
                          <th className="text-left p-4 text-sm font-medium text-gray-300">Exit</th>
                          <th className="text-left p-4 text-sm font-medium text-gray-300">PnL</th>
                          <th className="text-left p-4 text-sm font-medium text-gray-300">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {closedPositions.map((position) => {
                          const isProfitable = position.realized_pnl > 0;
                          return (
                            <tr key={position.id} className="border-t border-gray-700 hover:bg-gray-700/30">
                              <td className="p-4 text-white font-medium">{position.symbol}</td>
                              <td className="p-4">
                                <Badge className={`${
                                  position.side === "long" ? "bg-green-600/20 text-green-400" : "bg-red-600/20 text-red-400"
                                }`}>
                                  {position.side.toUpperCase()} {position.leverage}x
                                </Badge>
                              </td>
                              <td className="p-4 text-gray-300">${position.entry_price.toFixed(2)}</td>
                              <td className="p-4 text-gray-300">
                                {position.closed_at ? new Date(position.closed_at).toLocaleDateString() : "N/A"}
                              </td>
                              <td className={`p-4 font-medium ${isProfitable ? "text-green-400" : "text-red-400"}`}>
                                {isProfitable ? "+" : ""}{position.realized_pnl.toFixed(2)} USD
                              </td>
                              <td className="p-4">
                                <Badge className="bg-blue-600/20 text-blue-400">
                                  {position.status.charAt(0).toUpperCase() + position.status.slice(1)}
                                </Badge>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}