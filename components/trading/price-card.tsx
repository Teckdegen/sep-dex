"use client"

import { Card } from "@/components/ui/card"
import { ASSET_NAMES, type SupportedAsset } from "@/lib/price-feed/types"
import { TrendingUp, TrendingDown } from "lucide-react"
import { useState, useEffect } from "react"

interface PriceCardProps {
  symbol: SupportedAsset
  price: number
}

export function PriceCard({ symbol, price }: PriceCardProps) {
  const [prevPrice, setPrevPrice] = useState(price)
  const [priceChange, setPriceChange] = useState(0)
  const [priceChangePercent, setPriceChangePercent] = useState(0)

  useEffect(() => {
    // Calculate price change
    if (prevPrice > 0 && price > 0) {
      const change = price - prevPrice
      const changePercent = (change / prevPrice) * 100
      setPriceChange(change)
      setPriceChangePercent(changePercent)
    }
    setPrevPrice(price)
  }, [price, prevPrice])

  // Handle case where price might be 0 or invalid
  const displayPrice = price && price > 0 ? price : 0
  const isPositive = priceChange >= 0

  return (
    <Card className="border-border bg-card p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-semibold text-foreground">{ASSET_NAMES[symbol] || symbol}</div>
          <div className="text-xs text-muted-foreground">{symbol}</div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-foreground">
            ${displayPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          {priceChange !== 0 && (
            <div className={`flex items-center justify-end text-xs ${isPositive ? "text-success" : "text-danger"}`}>
              {isPositive ? (
                <TrendingUp className="h-3 w-3 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1" />
              )}
              <span>
                {isPositive ? "+" : ""}{priceChange.toFixed(2)} ({isPositive ? "+" : ""}{priceChangePercent.toFixed(2)}%)
              </span>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}