"use client"

import { useState, useEffect } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Card } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { getPriceHistory } from "@/lib/price-feed/coingecko"
import type { SupportedAsset } from "@/lib/price-feed/types"

interface PriceChartProps {
  symbol: SupportedAsset
}

export function PriceChart({ symbol }: PriceChartProps) {
  const [data, setData] = useState<Array<{ timestamp: number; price: number }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchPriceHistory() {
      try {
        setLoading(true)
        setError(null)
        const history = await getPriceHistory(symbol, 7) // Get 7 days of history
        setData(history)
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
  }, [symbol])

  if (loading) {
    return (
      <Card className="border-border bg-card p-4">
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-border bg-card p-4">
        <div className="flex h-64 items-center justify-center text-destructive">
          Error: {error}
        </div>
      </Card>
    )
  }

  if (data.length === 0) {
    return (
      <Card className="border-border bg-card p-4">
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          No price data available
        </div>
      </Card>
    )
  }

  // Format data for chart
  const chartData = data.map(item => ({
    time: new Date(item.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' }),
    price: item.price
  }))

  return (
    <Card className="border-border bg-card p-4">
      <h3 className="mb-4 text-lg font-semibold text-foreground">{symbol} Price Chart (7d)</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
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
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--background))",
                borderColor: "hsl(var(--border))",
                color: "hsl(var(--foreground))"
              }}
              formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Price']}
              labelStyle={{ color: "hsl(var(--foreground))" }}
            />
            <Line
              type="monotone"
              dataKey="price"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}