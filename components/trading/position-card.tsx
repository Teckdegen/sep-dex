"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { usePositionPnL } from "@/lib/trading/hooks"
import { closePosition } from "@/lib/trading/position-manager"
import { Loader2, TrendingUp, TrendingDown } from "lucide-react"
import type { Position } from "@/lib/trading/types"
import { useAuth } from "@/lib/auth/context"
import { getCurrentPrice } from "@/lib/price-feed/coingecko"

interface PositionCardProps {
  position: Position
}

export function PositionCard({ position }: PositionCardProps) {
  const { user, getUserPrivateKey } = useAuth()
  const { pnl, pnlPercent, isLiquidated } = usePositionPnL(position)
  const [isClosing, setIsClosing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentPrice, setCurrentPrice] = useState<number>(0)

  // Fetch current price for the position
  useEffect(() => {
    async function fetchCurrentPrice() {
      try {
        const price = await getCurrentPrice(position.symbol as any)
        setCurrentPrice(price)
      } catch (error) {
        console.error("[v0] Failed to fetch current price:", error)
      }
    }

    fetchCurrentPrice()
    const interval = setInterval(fetchCurrentPrice, 30000) // Update every 30 seconds

    return () => clearInterval(interval)
  }, [position.symbol])

  const handleClose = async () => {
    try {
      setIsClosing(true)
      setError(null)
      
      // Get current price for the asset
      const currentPrice = await getCurrentPrice(position.symbol)
      
      // Close position - admin payout will be handled server-side in position-manager.ts
      await closePosition(
        position.id, 
        currentPrice, 
        user?.walletAddress || '',
        undefined // Remove client-side admin key for security
      )
      window.location.reload()
    } catch (error) {
      console.error("[v0] Failed to close position:", error)
      setError(error instanceof Error ? error.message : "Failed to close position")
    } finally {
      setIsClosing(false)
    }
  }

  const isProfitable = pnl > 0
  
  // Calculate PNL in dollars
  const pnlInDollars = currentPrice > 0 ? (pnl / currentPrice) * position.collateral : 0

  return (
    <Card className={`border-border bg-card p-4 shadow-lg hover:shadow-xl transition-shadow ${isLiquidated ? "opacity-50" : ""}`}>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-bold text-lg text-foreground">{position.symbol || "N/A"}</span>
          <span
            className={`rounded px-2 py-0.5 text-xs font-medium ${
              position.side === "long" ? "bg-success/20 text-success" : "bg-danger/20 text-danger"
            }`}
          >
            {position.side ? position.side.toUpperCase() : "N/A"}
          </span>
          <span className="text-xs font-semibold text-muted-foreground">{position.leverage || 0}x</span>
        </div>
        {isLiquidated && <span className="text-xs font-medium text-destructive">LIQUIDATED</span>}
      </div>

      <div className="mb-3 space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Entry:</span>
          <span className="font-medium text-foreground">
            ${(position.entry_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Collateral:</span>
          <span className="font-medium text-foreground">
            {position.collateral.toFixed(2)} STX
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Liquidation:</span>
          <span className="font-medium text-foreground">
            ${(position.liquidation_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Current Price:</span>
          <span className="font-medium text-foreground">
            ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      <div className="mb-3 rounded-lg bg-secondary p-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">PnL</span>
          <div className="flex items-center gap-2">
            {isProfitable ? (
              <TrendingUp className="h-4 w-4 text-success" />
            ) : (
              <TrendingDown className="h-4 w-4 text-danger" />
            )}
            <div className="text-right">
              <div className={`font-bold ${isProfitable ? "text-success" : "text-danger"}`}>
                ${Math.abs(pnl).toFixed(2)} ({Math.abs(pnlInDollars).toFixed(2)} STX)
              </div>
              <div className={`text-xs font-medium ${isProfitable ? "text-success" : "text-danger"}`}>
                {pnlPercent > 0 ? "+" : ""}
                {pnlPercent.toFixed(2)}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && <div className="mb-2 rounded bg-destructive/10 p-2 text-xs text-destructive">{error}</div>}

      {!isLiquidated && (
        <Button
          onClick={handleClose}
          disabled={isClosing}
          className={`w-full ${isProfitable ? "bg-success hover:bg-success/90" : "bg-danger hover:bg-danger/90"}`}
          size="sm"
        >
          {isClosing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Closing...
            </>
          ) : (
            "Close Position"
          )}
        </Button>
      )}
    </Card>
  )
}