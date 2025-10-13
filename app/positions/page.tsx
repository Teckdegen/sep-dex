"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth/context"
import { usePositions } from "@/lib/trading/hooks"
import { checkLiquidations } from "@/lib/trading/position-manager"
import { useAllPrices } from "@/lib/price-feed/hooks"
import { Loader2, BarChart3, TrendingUp, TrendingDown } from "lucide-react"
import { Button } from "@/components/ui/button"
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
          const pnl = (priceDiff / position.entry_price) * position.collateral * position.leverage;
          total += pnl;
        }
      });
      setTotalPnL(total);
    }
  }, [positions, prices]);

  if (isLoading || !user) {
    return (
      <AppLayout walletAddress={user?.walletAddress || ""}>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    )
  }

  const openPositions = positions.filter(pos => pos.status === "open");
  const closedPositions = positions.filter(pos => pos.status !== "open");

  return (
    <AppLayout walletAddress={user.walletAddress}>
      <div className="container mx-auto p-4">
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Positions</h2>
              <p className="text-muted-foreground">Manage your open and closed positions</p>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                onClick={() => router.push("/trade")}
                className="bg-primary hover:bg-primary/90"
              >
                Open New Position
              </Button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-card border border-border rounded-lg p-4 shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Open Positions</p>
                <p className="text-2xl font-bold text-foreground">{openPositions.length}</p>
              </div>
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <BarChart3 className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </div>
          
          <div className="bg-card border border-border rounded-lg p-4 shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total PnL</p>
                <p className={`text-2xl font-bold ${totalPnL >= 0 ? "text-success" : "text-danger"}`}>
                  {totalPnL >= 0 ? "+" : ""}${Math.abs(totalPnL).toFixed(2)}
                </p>
              </div>
              <div className={`p-2 rounded-lg ${totalPnL >= 0 ? "bg-green-500/10" : "bg-red-500/10"}`}>
                {totalPnL >= 0 ? (
                  <TrendingUp className="h-6 w-6 text-green-500" />
                ) : (
                  <TrendingDown className="h-6 w-6 text-red-500" />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Positions Section */}
        <div className="mb-6">
          <h3 className="text-xl font-semibold text-foreground mb-4">Open Positions</h3>
          
          {positionsLoading || pricesLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : positionsError || pricesError ? (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
              Failed to load positions: {positionsError || pricesError}
            </div>
          ) : openPositions.length === 0 ? (
            <div className="rounded-lg border border-border bg-card p-8 text-center">
              <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No open positions</h3>
              <p className="text-muted-foreground mb-4">Start trading by opening a new position</p>
              <Button onClick={() => router.push("/trade")}>Open Position</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {openPositions.map((position) => (
                <PositionCard key={position.id} position={position} />
              ))}
            </div>
          )}
        </div>

        {/* Closed Positions Section */}
        {closedPositions.length > 0 && (
          <div>
            <h3 className="text-xl font-semibold text-foreground mb-4">Closed Positions</h3>
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-secondary/50">
                    <tr>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Asset</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Type</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Entry</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Exit</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">PnL</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {closedPositions.map((position) => {
                      const isProfitable = position.realized_pnl > 0;
                      return (
                        <tr key={position.id} className="border-t border-border hover:bg-secondary/30">
                          <td className="p-4 text-foreground font-medium">{position.symbol}</td>
                          <td className="p-4">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              position.side === "long" ? "bg-success/20 text-success" : "bg-danger/20 text-danger"
                            }`}>
                              {position.side.toUpperCase()} {position.leverage}x
                            </span>
                          </td>
                          <td className="p-4 text-foreground">${position.entry_price.toFixed(2)}</td>
                          <td className="p-4 text-foreground">
                            {position.closed_at ? new Date(position.closed_at).toLocaleDateString() : "N/A"}
                          </td>
                          <td className={`p-4 font-medium ${isProfitable ? "text-success" : "text-danger"}`}>
                            {isProfitable ? "+" : ""}{position.realized_pnl.toFixed(2)} USD
                          </td>
                          <td className="p-4">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              position.status === "closed" ? "bg-blue-500/20 text-blue-500" : "bg-destructive/20 text-destructive"
                            }`}>
                              {position.status.charAt(0).toUpperCase() + position.status.slice(1)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}