import type { TradeParameters, TradeResult } from "./types"

export function computePosition(params: TradeParameters): TradeResult {
  const { entry, price, collateral, leverage, direction } = params

  // Input validation
  if (entry <= 0) {
    throw new Error("Entry price must be positive")
  }
  if (collateral <= 0) {
    throw new Error("Collateral must be positive")
  }
  if (leverage < 1 || leverage > 100) {
    throw new Error("Leverage must be between 1 and 100")
  }
  if (price <= 0) {
    throw new Error("Current price must be positive")
  }

  // Position sizing: Q = (Collateral × Leverage) / Entry Price
  const positionSize = (collateral * leverage) / entry

  // Price difference based on direction
  // For long: profit when price > entry (price - entry)
  // For short: profit when price < entry (entry - price)
  const priceDiff = direction === "long" ? price - entry : entry - price

  // PnL calculation: PnL = Q × Price Diff (since Q already includes leverage)
  // Where Q = positionSize = (collateral * leverage) / entry_price (number of units)
  // Price Diff = current_price - entry_price for long, entry_price - current_price for short
  // For long: PnL = (current_price - entry_price) × positionSize
  // For short: PnL = (entry_price - current_price) × positionSize
  const pnl = positionSize * priceDiff

  // Percentage return: PnL% = (Price Diff / Entry) × Leverage × 100
  // This matches: PnL% = (Pₓ - Pₑ) / Pₑ × L × 100 for long
  const pnlPercent = (priceDiff / entry) * leverage * 100

  // Liquidation price calculation
  const liquidationPrice =
    direction === "long"
      ? entry * (1 - 1 / leverage) // Long: Entry × (1 - 1/Leverage)
      : entry * (1 + 1 / leverage) // Short: Entry × (1 + 1/Leverage)

  // Check if position is liquidated
  // For long: liquidated when price <= liquidationPrice
  // For short: liquidated when price >= liquidationPrice
  const isLiquidated = direction === "long" ? price <= liquidationPrice : price >= liquidationPrice

  // Calculate payout (cannot be negative)
  const payoutIfProfit = Math.max(0, collateral + pnl)

  return {
    positionSize,
    pnl,
    pnlPercent,
    liquidationPrice,
    payoutIfProfit,
    isLiquidated,
  }
}

export function calculateLiquidationPrice(entryPrice: number, leverage: number, direction: "long" | "short"): number {
  if (direction === "long") {
    return entryPrice * (1 - 1 / leverage)
  }
  return entryPrice * (1 + 1 / leverage)
}

export function calculatePositionSize(collateral: number, leverage: number, entryPrice: number): number {
  return (collateral * leverage) / entryPrice
}

export function getRiskLevel(leverage: number): "LOW" | "MODERATE" | "HIGH" | "EXTREME" {
  if (leverage >= 50) return "EXTREME"
  if (leverage >= 25) return "HIGH"
  if (leverage >= 10) return "MODERATE"
  return "LOW"
}

export function getRiskWarning(leverage: number): string {
  const riskLevel = getRiskLevel(leverage)

  switch (riskLevel) {
    case "EXTREME":
      return "Extreme risk - positions can be liquidated with <1% adverse moves"
    case "HIGH":
      return "Very high risk - small price movements can result in total loss"
    case "MODERATE":
      return "Moderate risk - significant price movements can result in substantial losses"
    case "LOW":
      return "Lower risk - larger price movements needed for liquidation"
  }
}