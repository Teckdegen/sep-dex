"use client"

import { useState, useEffect } from "react"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { getPriceHistory } from "@/lib/price-feed/coingecko"
import { Loader2 } from "lucide-react"

interface PriceChartProps {
  asset: string
  height?: number
}

export function PriceChart({ asset, height = 300 }: PriceChartProps) {
  const [data, setData] = useState<Array<{ timestamp: number; price: number }>>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeframe, setTimeframe] = useState(1) // days

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true)
        setError(null)
        const history = await getPriceHistory(asset, timeframe)
        if (history.length === 0) {
          setError("No historical data available for this asset and timeframe")
        } else {
          setData(history)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load chart")
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [asset, timeframe])

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center" style={{ height }}>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2" style={{ height }}>
        <p className="text-sm text-destructive">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">{asset} Price Chart</h3>
        <div className="flex gap-1">
          {[
            { label: "1H", value: 1 / 24 },
            { label: "1D", value: 1 },
            { label: "1W", value: 7 },
            { label: "1M", value: 30 },
          ].map((tf) => (
            <button
              key={tf.label}
              onClick={() => setTimeframe(tf.value)}
              className={`rounded px-2 py-1 text-xs transition-colors ${
                timeframe === tf.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis
            dataKey="timestamp"
            tickFormatter={(value) => new Date(value).toLocaleDateString()}
            stroke="#a1a1aa"
            style={{ fontSize: 12 }}
          />
          <YAxis tickFormatter={(value) => `$${value.toLocaleString()}`} stroke="#a1a1aa" style={{ fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#18181b",
              border: "1px solid #27272a",
              borderRadius: "0.5rem",
              color: "#e4e4e7",
            }}
            labelFormatter={(value) => new Date(value).toLocaleString()}
            formatter={(value: number) => [`$${value.toLocaleString()}`, "Price"]}
          />
          <Area type="monotone" dataKey="price" stroke="#3b82f6" strokeWidth={2} fill="url(#priceGradient)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
