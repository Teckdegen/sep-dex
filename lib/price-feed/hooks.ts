"use client"

import { useState, useEffect } from "react"
import { priceFeedManager } from "./manager"
import { getPriceHistory } from "./coingecko"
import type { SupportedAsset } from "./types"

export function usePrice(asset: SupportedAsset, refreshInterval = 30000) {
  const [price, setPrice] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    async function fetchPrice() {
      try {
        const currentPrice = await priceFeedManager.getPrice(asset)
        if (isMounted) {
          setPrice(currentPrice)
          setError(null)
        }
      } catch (err) {
        console.error(`[v0] Failed to fetch price for ${asset}:`, err)
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to fetch price")
          setPrice(0) // Set default price on error
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    fetchPrice()
    const interval = setInterval(fetchPrice, refreshInterval)

    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [asset, refreshInterval])

  return { price, isLoading, error }
}

export function useAllPrices(refreshInterval = 60000) {
  const [prices, setPrices] = useState<Record<SupportedAsset, number> | null>(null)
  const [priceChanges, setPriceChanges] = useState<Record<SupportedAsset, number> | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    async function fetchPrices() {
      try {
        const allPrices = await priceFeedManager.getAllPrices()
        const allPriceChanges: Record<SupportedAsset, number> = {
          BTC: 0, ETH: 0, STX: 0, SOL: 0, BNB: 0, ADA: 0, XRP: 0, DOGE: 0, DOT: 0, LTC: 0, AVAX: 0, MATIC: 0, UNI: 0, LINK: 0, BCH: 0,
        }

        // Fetch price changes for each asset
        const assets: SupportedAsset[] = ["BTC", "ETH", "STX", "SOL", "BNB", "ADA", "XRP", "DOGE", "DOT", "LTC", "AVAX", "MATIC", "UNI", "LINK", "BCH"]
        for (const asset of assets) {
          try {
            const priceData = await priceFeedManager.getPriceWithChange(asset)
            allPriceChanges[asset] = priceData.priceChangePercentage24h
            // Update prices with the fetched price
            if (allPrices[asset] !== priceData.price) {
              allPrices[asset] = priceData.price
            }
          } catch (err) {
            console.warn(`[v0] Failed to fetch price for ${asset}, trying historical fallback`)
            try {
              // Fallback to latest historical price
              const history = await getPriceHistory(asset, 1) // Get 1 day history
              if (history.length > 0) {
                allPrices[asset] = history[history.length - 1].price
                allPriceChanges[asset] = 0 // No change data for historical
              } else {
                allPrices[asset] = 0
                allPriceChanges[asset] = 0
              }
            } catch (histErr) {
              allPrices[asset] = 0
              allPriceChanges[asset] = 0
            }
          }
        }

        if (isMounted) {
          setPrices(allPrices)
          setPriceChanges(allPriceChanges)
          setError(null)
        }
      } catch (err) {
        console.error("[v0] Failed to fetch all prices:", err)
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to fetch prices")
          // Set default prices on error
          setPrices({
            BTC: 0,
            ETH: 0,
            STX: 0,
            SOL: 0,
            BNB: 0,
            ADA: 0,
            XRP: 0,
            DOGE: 0,
            DOT: 0,
            LTC: 0,
            AVAX: 0,
            MATIC: 0,
            UNI: 0,
            LINK: 0,
            BCH: 0,
          })
          setPriceChanges({
            BTC: 0,
            ETH: 0,
            STX: 0,
            SOL: 0,
            BNB: 0,
            ADA: 0,
            XRP: 0,
            DOGE: 0,
            DOT: 0,
            LTC: 0,
            AVAX: 0,
            MATIC: 0,
            UNI: 0,
            LINK: 0,
            BCH: 0,
          })
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    fetchPrices()
    const interval = setInterval(fetchPrices, refreshInterval)

    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [refreshInterval])

  return { prices, priceChanges, isLoading, error }
}
