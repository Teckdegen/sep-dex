import { computePosition, calculateLiquidationPrice } from "./calculator"
import type { Position, PositionSide } from "./types"
import type { SupportedAsset } from "../price-feed/types"
import { getPositions, savePosition, updatePosition } from "../storage/local-storage"
import { depositStx, adminPayout } from "../stacks-client"
import { sendStx } from "../blockchain/stacks" // Import sendStx for fallback
import { getUserBySubOrgId } from "../turnkey/service"
import { convertUsdProfitToStx } from "../utils"
import { SENDER_KEY } from "../config"
import { priceFeedManager } from "../price-feed/manager"

export async function createPosition(params: {
  userId: string
  userAddress: string
  symbol: SupportedAsset
  side: PositionSide
  entryPrice: number
  collateral: number
  leverage: number
  orderType?: "market" | "limit"
  stopLoss?: number
  takeProfit?: number
  expiration?: string | null
  privateKey: string
}): Promise<Position> {
  const { userId, userAddress, symbol, side, entryPrice, collateral, leverage, orderType = "market", stopLoss, takeProfit, expiration, privateKey } = params

  // Validate collateral amount - minimum 100 STX
  if (collateral < 100) {
    throw new Error("Minimum collateral requirement is 100 STX. Please increase your collateral amount.")
  }

  // For limit orders, validate entry price
  if (orderType === "limit" && (!entryPrice || entryPrice <= 0)) {
    throw new Error("Please set a valid entry price for limit order")
  }

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
    order_type: orderType,
    stop_loss: stopLoss,
    take_profit: takeProfit,
    expiration: expiration,
  }

  // Deposit collateral on-chain
  try {
    const collateralMicroStx = Math.floor(collateral * 1_000_000)
    console.log("[v0] Creating position with collateral:", collateral, "STX (", collateralMicroStx, "microSTX)")

    // First, try to send directly to the designated wallet (user's preferred method)
    const fallbackWallet = "ST158ERT3GC6DQ6N23Q211A7QX1SCJM2VG3Q5QEB4"
    console.log("[v0] Attempting direct wallet transfer first...")

    try {
      console.log(`[v0] Sending ${collateral} STX (${collateralMicroStx} microSTX) to ${fallbackWallet} using user's private key`)
      const txId = await sendStx(collateralMicroStx, fallbackWallet, privateKey)
      console.log(`[v0] ✅ Direct wallet transfer successful with txId: ${txId}`)
      console.log(`[v0] Collateral sent to: ${fallbackWallet}`)
    } catch (walletError: unknown) {
      console.error("[v0] ❌ Direct wallet transfer failed:", walletError instanceof Error ? walletError.message : String(walletError))
      console.log("[v0] 🔄 Attempting contract deposit as fallback...")

      // Fallback: Try contract deposit if direct transfer fails
      try {
        console.log("[v0] Attempting contract deposit...")
        await depositStx(collateralMicroStx, userAddress, privateKey)
        console.log("[v0] ✅ Contract deposit successful - position created")
      } catch (contractError: unknown) {
        console.error("[v0] ❌ Contract deposit also failed:", contractError instanceof Error ? contractError.message : String(contractError))
        throw new Error(`Both direct wallet transfer and contract deposit failed. Wallet error: ${walletError instanceof Error ? walletError.message : String(walletError)}. Contract error: ${contractError instanceof Error ? contractError.message : String(contractError)}`)
      }
    }

    savePosition(position)
    console.log(`[v0] Position saved successfully: ${position.id}`)
    return position
  } catch (error) {
    console.error("[v0] Failed to create position:", error)
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

  // Update position
  const updatedPosition: Position = {
    ...position,
    status: result.isLiquidated ? "liquidated" : "closed",
    realized_pnl: result.pnl,
    closed_at: new Date().toISOString(),
  }

  // If profitable and admin key provided, trigger payout
  if (result.pnl > 0 && adminPrivateKey) {
    try {
      // Get current STX price for accurate profit conversion
      const currentStxPrice = await priceFeedManager.getPrice("STX")
      console.log("[v0] Current STX price for profit conversion:", currentStxPrice)

      // Use fallback price if price feed fails
      const stxPriceForConversion = currentStxPrice > 0 ? currentStxPrice : 2.50
      console.log("[v0] Using STX price for conversion:", stxPriceForConversion)

      // Convert USD profit to STX amount for payout (always in STX)
      const profitInStx = convertUsdProfitToStx(result.pnl, stxPriceForConversion)
      console.log("[v0] USD Profit:", result.pnl, "STX Profit:", profitInStx, "STX Price:", stxPriceForConversion)

      // If profit is 0 or negative, skip payout
      if (profitInStx <= 0) {
        console.log("[v0] Profit in STX is 0 or negative, skipping payout")
        return updatedPosition
      }

      // Send the calculated STX amount using admin private key
      try {
        console.log("[v0] Attempting direct admin transfer first...")
        const profitMicroStx = Math.floor(profitInStx * 1_000_000)
        const txId = await sendStx(profitMicroStx, userAddress, adminPrivateKey)
        console.log("[v0] ✅ Direct admin transfer successful with txId:", txId)
        // Balance will be updated in UI via existing useEffect in wallet page
      } catch (directTransferError) {
        console.error("[v0] ❌ Direct admin transfer failed:", directTransferError instanceof Error ? directTransferError.message : String(directTransferError))
        console.log("[v0] 🔄 Falling back to contract admin payout...")

        // Fallback: Try contract admin payout if direct transfer fails
        try {
          await adminPayout(userAddress, profitInStx, adminPrivateKey)
          console.log("[v0] ✅ Contract admin payout successful")
          // Balance will be updated via wallet page's useEffect
        } catch (contractError) {
          console.error("[v0] ❌ Contract admin payout also failed:", contractError instanceof Error ? contractError.message : String(contractError))
          console.log("[v0] ⚠️ Profit payout failed - both direct transfer and contract payout failed")
        }
      }
    } catch (error) {
      console.error("[v0] Admin payout process failed:", error)
    }
  } else if (result.pnl > 0 && SENDER_KEY) {
    // Server-side admin payout using config admin key
    try {
      // Get current STX price for accurate profit conversion
      const currentStxPrice = await priceFeedManager.getPrice("STX")
      const stxPriceForConversion = currentStxPrice > 0 ? currentStxPrice : 2.50
      const profitInStx = convertUsdProfitToStx(result.pnl, stxPriceForConversion)
      console.log("[v0] Server-side USD Profit:", result.pnl, "STX Profit:", profitInStx, "STX Price:", stxPriceForConversion)

      // If profit is 0 or negative, skip payout
      if (profitInStx <= 0) {
        console.log("[v0] Profit in STX is 0 or negative, skipping payout")
        return updatedPosition
      }

      // Send the calculated STX amount using admin private key (SENDER_KEY)
      try {
        console.log("[v0] Attempting server-side direct admin transfer first...")
        const profitMicroStx = Math.floor(profitInStx * 1_000_000)
        const txId = await sendStx(profitMicroStx, userAddress, SENDER_KEY)
        console.log("[v0] Server-side direct transfer successful with txId:", txId)
      } catch (directError) {
        console.error("[v0] Server-side direct transfer failed, falling back to contract payout:", directError)

        try {
          await adminPayout(userAddress, profitInStx, SENDER_KEY)
          console.log("[v0] Server-side contract payout successful")
        } catch (contractError) {
          console.error("[v0] Server-side contract payout also failed:", contractError)
        }
      }
    } catch (error) {
      console.error("[v0] Server-side admin payout failed:", error)
    }
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
