"use client"

import { useState, useEffect } from "react"
import { computePosition } from "./calculator"
import { type Position } from "./types"
import { getUserPositions, type StoredPosition } from "../storage/local-storage"
import { useAuth } from "../auth/context"
import { getCurrentPrice } from "../price-feed/coingecko"

export function usePositions() {
  const { user } = useAuth()
  const [positions, setPositions] = useState<Position[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      setPositions([])
      setIsLoading(false)
      return
    }

    async function fetchPositions() {
      try {
        const storedPositions = getUserPositions(user.id).filter((p: StoredPosition) => p.status === "open")
        // Map StoredPosition to Position type
        const formattedPositions = storedPositions.map((pos: StoredPosition) => ({
          id: pos.id,
          user_id: pos.user_id,
          symbol: pos.symbol,
          side: pos.side,
          entry_price: pos.entry_price,
          size: pos.size,
          leverage: pos.leverage,
          collateral: pos.collateral,
          liquidation_price: pos.liquidation_price,
          status: pos.status,
          realized_pnl: pos.realized_pnl,
          opened_at: pos.opened_at,
          closed_at: pos.closed_at,
        }))
        setPositions(formattedPositions)
        setError(null)
      } catch (err) {
        console.error("[v0] Failed to fetch positions:", err)
        setError(err instanceof Error ? err.message : "Failed to fetch positions")
        setPositions([]) // Set empty array on error
      } finally {
        setIsLoading(false)
      }
    }

    fetchPositions()
    const interval = setInterval(fetchPositions, 5000) // Refresh every 5 seconds

    return () => clearInterval(interval)
  }, [user])

  return { positions, isLoading, error }
}

export function usePositionPnL(position: Position | null) {
  const [pnl, setPnl] = useState<number>(0)
  const [pnlPercent, setPnlPercent] = useState<number>(0)
  const [isLiquidated, setIsLiquidated] = useState(false)

  useEffect(() => {
    if (!position) return

    async function updatePnL() {
      try {
        const currentPrice = await getCurrentPrice(position.symbol)

        const result = computePosition({
          entry: position.entry_price,
          price: currentPrice,
          collateral: position.collateral,
          leverage: position.leverage,
          direction: position.side,
        })

        setPnl(result.pnl)
        setPnlPercent(result.pnlPercent)
        setIsLiquidated(result.isLiquidated)
      } catch (error) {
        console.error("[v0] PnL calculation failed:", error)
        // Set default values on error
        setPnl(0)
        setPnlPercent(0)
        setIsLiquidated(false)
      }
    }

    updatePnL()
    const interval = setInterval(updatePnL, 2000) // Update every 2 seconds

    return () => clearInterval(interval)
  }, [position])

  return { pnl, pnlPercent, isLiquidated }
}

export function usePriceData(asset: string) {
  const [price, setPrice] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!asset) return

    async function fetchPrice() {
      try {
        const currentPrice = await getCurrentPrice(asset)
        setPrice(currentPrice)
        setError(null)
      } catch (err) {
        console.error("[v0] Failed to fetch price:", err)
        setError(err instanceof Error ? err.message : "Failed to fetch price")
        setPrice(null) // Set null on error
      } finally {
        setIsLoading(false)
      }
    }

    fetchPrice()
    const interval = setInterval(fetchPrice, 2000) // Update every 2 seconds

    return () => clearInterval(interval)
  }, [asset])

  return { price, isLoading, error }
}
