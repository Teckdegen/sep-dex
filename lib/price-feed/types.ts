export type SupportedAsset = "BTC" | "ETH" | "STX" | "SOL"

export interface PriceData {
  asset: SupportedAsset
  price: number
  timestamp: number
  source: string
}

export interface CachedPrice {
  price: number
  timestamp: number
}

export const ASSET_TO_COINGECKO_ID: Record<SupportedAsset, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  STX: "stacks",
  SOL: "solana",
}

export const ASSET_NAMES: Record<SupportedAsset, string> = {
  BTC: "Bitcoin",
  ETH: "Ethereum",
  STX: "Stacks",
  SOL: "Solana",
}
