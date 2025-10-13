"use client"

import { Card } from "@/components/ui/card"
import { ASSET_NAMES, type SupportedAsset } from "@/lib/price-feed/types"

interface PriceCardProps {
  symbol: SupportedAsset
  price: number
}

export function PriceCard({ symbol, price }: PriceCardProps) {
  // Handle case where price might be 0 or invalid
  const displayPrice = price && price > 0 ? price : 0

  return (
    <Card className="border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium text-muted-foreground">{ASSET_NAMES[symbol] || symbol}</div>
          <div className="text-xs text-muted-foreground">{symbol}</div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-foreground">
            ${displayPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>
    </Card>
  )
}
