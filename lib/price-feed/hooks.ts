"use client"

import { useState, useEffect } from "react"
import { priceFeedManager } from "./manager"
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
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    async function fetchPrices() {
      try {
        const allPrices = await priceFeedManager.getAllPrices()
        if (isMounted) {
          setPrices(allPrices)
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

  return { prices, isLoading, error }
}
