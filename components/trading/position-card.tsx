"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { usePositionPnL } from "@/lib/trading/hooks"
import { closePosition } from "@/lib/trading/position-manager"
import { Loader2, TrendingUp, TrendingDown } from "lucide-react"
import type { Position } from "@/lib/trading/types"

interface PositionCardProps {
  position: Position
}

export function PositionCard({ position }: PositionCardProps) {
  const { pnl, pnlPercent, isLiquidated } = usePositionPnL(position)
  const [isClosing, setIsClosing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleClose = async () => {
    try {
      setIsClosing(true)
      setError(null)
      await closePosition(position.id, position.entry_price + pnl)
      window.location.reload()
    } catch (error) {
      console.error("[v0] Failed to close position:", error)
      setError(error instanceof Error ? error.message : "Failed to close position")
    } finally {
      setIsClosing(false)
    }
  }

  const isProfitable = pnl > 0

  return (
    <Card className={`border-border bg-card p-4 ${isLiquidated ? "opacity-50" : ""}`}>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-foreground">{position.symbol || "N/A"}</span>
          <span
            className={`rounded px-2 py-0.5 text-xs font-medium ${
              position.side === "long" ? "bg-success/20 text-success" : "bg-danger/20 text-danger"
            }`}
          >
            {position.side ? position.side.toUpperCase() : "N/A"}
          </span>
          <span className="text-xs text-muted-foreground">{position.leverage || 0}x</span>
        </div>
        {isLiquidated && <span className="text-xs font-medium text-destructive">LIQUIDATED</span>}
      </div>

      <div className="mb-3 space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Entry:</span>
          <span className="text-foreground">
            ${(position.entry_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Collateral:</span>
          <span className="text-foreground">
            ${(position.collateral || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Liquidation:</span>
          <span className="text-foreground">
            ${(position.liquidation_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      <div className="mb-3 rounded-lg bg-secondary p-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">PnL</span>
          <div className="flex items-center gap-2">
            {isProfitable ? (
              <TrendingUp className="h-4 w-4 text-success" />
            ) : (
              <TrendingDown className="h-4 w-4 text-danger" />
            )}
            <div className="text-right">
              <div className={`font-semibold ${isProfitable ? "text-success" : "text-danger"}`}>
                ${Math.abs(pnl).toFixed(2)}
              </div>
              <div className={`text-xs ${isProfitable ? "text-success" : "text-danger"}`}>
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
          variant="outline"
          className="w-full bg-transparent"
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
