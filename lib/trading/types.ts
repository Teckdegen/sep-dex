export type PositionSide = "long" | "short"
export type PositionStatus = "open" | "closed" | "liquidated"
export type OrderType = "market" | "limit"

export interface TradeParameters {
  entry: number
  price: number
  collateral: number
  leverage: number
  direction: PositionSide
}

export interface TradeResult {
  positionSize: number
  pnl: number
  pnlPercent: number
  liquidationPrice: number
  payoutIfProfit: number
  isLiquidated: boolean
}

export interface Position {
  id: string
  user_id: string
  symbol: string
  side: PositionSide
  entry_price: number
  size: number
  leverage: number
  collateral: number
  liquidation_price: number
  status: PositionStatus
  realized_pnl: number
  opened_at: string
  closed_at?: string
  order_type?: OrderType
  stop_loss?: number
  take_profit?: number
  expiration?: string | null
}
