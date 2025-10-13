"use client"

import { useState, useEffect } from "react"
import { getCurrentPrice } from "@/lib/price-feed/coingecko"

export default function TestPage() {
  const [prices, setPrices] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchAllPrices() {
      try {
        setLoading(true)
        const assets = ["BTC", "ETH", "STX", "SOL"]
        const priceData: Record<string, number> = {}
        
        for (const asset of assets) {
          try {
            const price = await getCurrentPrice(asset)
            priceData[asset] = price
            console.log(`Price for ${asset}:`, price)
          } catch (err) {
            console.error(`Error fetching price for ${asset}:`, err)
            priceData[asset] = 0
          }
        }
        
        setPrices(priceData)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch prices")
      } finally {
        setLoading(false)
      }
    }

    fetchAllPrices()
  }, [])

  if (loading) {
    return <div>Loading prices...</div>
  }

  if (error) {
    return <div>Error: {error}</div>
  }

  return (
    <div>
      <h1>Price Test</h1>
      <div>
        {Object.entries(prices).map(([asset, price]) => (
          <div key={asset}>
            <strong>{asset}:</strong> ${price.toFixed(2)}
          </div>
        ))}
      </div>
    </div>
  )
}