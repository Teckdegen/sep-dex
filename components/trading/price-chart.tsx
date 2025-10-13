"use client"

import { useState, useEffect } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts"
import { Card } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { getPriceHistory } from "@/lib/price-feed/coingecko"
import type { SupportedAsset } from "@/lib/price-feed/types"

interface PriceChartProps {
  symbol: SupportedAsset
}

interface ChartDataPoint {
  time: string
  price: number
  timestamp: number
  isIncreasing: boolean
}

export function PriceChart({ symbol }: PriceChartProps) {
  const [data, setData] = useState<ChartDataPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState<number>(7) // 7 days by default

  useEffect(() => {
    async function fetchPriceHistory() {
      try {
        setLoading(true)
        setError(null)
        const history = await getPriceHistory(symbol, timeRange)
        const chartData = history.map((item, index) => ({
          time: new Date(item.timestamp).toLocaleDateString([], { 
            month: 'short', 
            day: 'numeric',
            hour: timeRange <= 1 ? '2-digit' : undefined,
            minute: timeRange <= 1 ? '2-digit' : undefined
          }),
          price: item.price,
          timestamp: item.timestamp,
          isIncreasing: index === 0 ? true : item.price >= history[index - 1].price
        }))
        setData(chartData)
      } catch (err) {
        console.error(`[v0] Failed to fetch price history for ${symbol}:`, err)
        setError(err instanceof Error ? err.message : "Failed to fetch price history")
        setData([])
      } finally {
        setLoading(false)
      }
    }

    fetchPriceHistory()
    const interval = setInterval(fetchPriceHistory, 60000) // Refresh every 60 seconds

    return () => clearInterval(interval)
  }, [symbol, timeRange])

  if (loading) {
    return (
      <div className="flex h-80 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-80 items-center justify-center text-destructive">
        Error: {error}
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="flex h-80 items-center justify-center text-muted-foreground">
        No price data available
      </div>
    )
  }

  // Calculate price change
  const firstPrice = data[0]?.price || 0
  const lastPrice = data[data.length - 1]?.price || 0
  const priceChange = lastPrice - firstPrice
  const priceChangePercent = firstPrice > 0 ? (priceChange / firstPrice) * 100 : 0

  // Determine overall trend color
  const isPositiveTrend = priceChange >= 0
  const lineColor = isPositiveTrend ? '#10b981' : '#ef4444' // green-500 or red-500

  return (
    <div className="space-y-4">
      {/* Time range selector */}
      <div className="flex justify-end">
        <div className="inline-flex rounded-md bg-muted p-1">
          {[1, 7, 30, 90].map((days) => (
            <button
              key={days}
              type="button"
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                timeRange === days
                  ? "bg-background text-foreground shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setTimeRange(days)}
            >
              {days === 1 ? '24h' : `${days}d`}
            </button>
          ))}
        </div>
      </div>

      {/* Price change indicator */}
      <div className="flex items-center gap-2">
        <span className="text-2xl font-bold">
          ${lastPrice.toFixed(2)}
        </span>
        <span className={`flex items-center text-sm font-medium ${
          isPositiveTrend ? "text-green-500" : "text-red-500"
        }`}>
          {isPositiveTrend ? '↑' : '↓'} 
          ${Math.abs(priceChange).toFixed(2)} ({Math.abs(priceChangePercent).toFixed(2)}%)
        </span>
      </div>

      {/* Chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="time" 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `$${value.toFixed(2)}`}
              domain={['auto', 'auto']}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--background))",
                borderColor: "hsl(var(--border))",
                color: "hsl(var(--foreground))",
                borderRadius: "0.5rem",
              }}
              formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Price']}
              labelStyle={{ color: "hsl(var(--foreground))" }}
              labelFormatter={(label) => `Date: ${label}`}
            />
            <ReferenceLine 
              y={firstPrice} 
              stroke="hsl(var(--muted-foreground))" 
              strokeDasharray="3 3" 
              strokeWidth={1}
            />
            <Line
              type="monotone"
              dataKey="price"
              stroke={lineColor}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6, stroke: lineColor, strokeWidth: 2, fill: "hsl(var(--background))" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}