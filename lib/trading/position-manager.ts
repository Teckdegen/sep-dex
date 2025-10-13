import { computePosition, calculateLiquidationPrice } from "./calculator"
import type { Position, PositionSide } from "./types"
import type { SupportedAsset } from "../price-feed/types"
import { getPositions, savePosition, updatePosition } from "../storage/local-storage"
import { depositStx, adminPayout } from "../stacks-client"
import { getUserBySubOrgId } from "../turnkey/service"

export async function createPosition(params: {
  userId: string
  userAddress: string
  symbol: SupportedAsset
  side: PositionSide
  entryPrice: number
  collateral: number
  leverage: number
  privateKey: string
}): Promise<Position> {
  const { userId, userAddress, symbol, side, entryPrice, collateral, leverage, privateKey } = params

  // Calculate position details
  const size = (collateral * leverage) / entryPrice
  const liquidationPrice = calculateLiquidationPrice(entryPrice, leverage, side)

  const position: Position = {
    id: `pos-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    user_id: userId,
    symbol,
    side,
    entry_price: entryPrice,
    size,
    leverage,
    collateral,
    liquidation_price: liquidationPrice,
    status: "open",
    realized_pnl: 0,
    opened_at: new Date().toISOString(),
  }

  console.log("[v0] Creating position:", position)

  // Deposit collateral on-chain
  try {
    const collateralMicroStx = Math.floor(collateral * 1_000_000)
    console.log("[v0] Depositing collateral on-chain:", collateralMicroStx)

    // Deposit collateral using user's private key
    await depositStx(collateralMicroStx, userAddress, privateKey)

    savePosition(position)
    return position
  } catch (error) {
    console.error("[v0] Failed to deposit collateral:", error)
    throw new Error("Failed to deposit collateral on-chain")
  }
}

export async function getOpenPositions(userId: string): Promise<Position[]> {
  const positions = getPositions()
  return positions.filter((pos) => pos.user_id === userId && pos.status === "open")
}

export async function getAllPositions(userId: string): Promise<Position[]> {
  const positions = getPositions()
  return positions.filter((pos) => pos.user_id === userId)
}

export async function closePosition(
  positionId: string,
  currentPrice: number,
  userAddress: string,
  adminPrivateKey?: string,
): Promise<Position> {
  const positions = getPositions()
  const position = positions.find((pos) => pos.id === positionId)

  if (!position) {
    throw new Error("Position not found")
  }

  // Calculate final PnL
  const result = computePosition({
    entry: position.entry_price,
    price: currentPrice,
    collateral: position.collateral,
    leverage: position.leverage,
    direction: position.side,
  })

  console.log("[v0] Closing position:", { positionId, pnl: result.pnl, isLiquidated: result.isLiquidated })

  // If profitable and admin key provided, trigger payout
  if (result.pnl > 0 && adminPrivateKey) {
    try {
      const profitMicroStx = Math.floor(result.pnl * 1_000_000)
      console.log("[v0] Triggering admin payout:", profitMicroStx)

      // Call admin payout to send profits to user
      await adminPayout(userAddress, profitMicroStx, adminPrivateKey)
    } catch (error) {
      console.error("[v0] Admin payout failed:", error)
    }
  }

  // Update position
  const updatedPosition: Position = {
    ...position,
    status: result.isLiquidated ? "liquidated" : "closed",
    realized_pnl: result.pnl,
    closed_at: new Date().toISOString(),
  }

  updatePosition(updatedPosition)
  return updatedPosition
}

export async function checkLiquidations(
  userId: string,
  currentPrices: Record<string, number>,
  adminPrivateKey?: string,
) {
  const positions = await getOpenPositions(userId)

  for (const position of positions) {
    const currentPrice = currentPrices[position.symbol]
    if (!currentPrice) continue

    const result = computePosition({
      entry: position.entry_price,
      price: currentPrice,
      collateral: position.collateral,
      leverage: position.leverage,
      direction: position.side,
    })

    if (result.isLiquidated) {
      console.log("[v0] Position liquidated:", position.id)
      // For liquidations, we don't need admin payout, so we pass undefined for adminPrivateKey
      // We pass an empty string for userAddress since we don't need it for liquidations
      await closePosition(position.id, currentPrice, '', undefined)
    }
  }
}
