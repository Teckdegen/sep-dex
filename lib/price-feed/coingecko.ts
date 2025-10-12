// CoinGecko price feed integration
import { savePriceCache, getCachedPrice } from "../storage/local-storage"

const COINGECKO_API = "https://api.coingecko.com/api/v3"

const ASSET_TO_COINGECKO_ID: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  STX: "stacks",
  SOL: "solana",
}

export interface PriceData {
  asset: string
  price: number
  priceChange24h: number
  priceChangePercentage24h: number
  high24h: number
  low24h: number
  volume24h: number
  marketCap: number
  lastUpdated: number
}

// Get current price from CoinGecko
export async function getCurrentPrice(asset: string): Promise<number> {
  // Check cache first (30 second cache)
  const cached = getCachedPrice(asset, 30000)
  if (cached) {
    return cached
  }

  const coinGeckoId = ASSET_TO_COINGECKO_ID[asset]
  if (!coinGeckoId) {
    throw new Error(`Unsupported asset: ${asset}`)
  }

  try {
    const response = await fetch(`${COINGECKO_API}/simple/price?ids=${coinGeckoId}&vs_currencies=usd`)

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`)
    }

    const data = await response.json()
    const price = data[coinGeckoId]?.usd

    if (!price) {
      throw new Error(`No price data for ${asset}`)
    }

    // Cache the price
    savePriceCache(asset, price)

    return price
  } catch (error) {
    console.error(`Failed to fetch price for ${asset}:`, error)
    throw error
  }
}

// Get detailed price data
export async function getPriceData(asset: string): Promise<PriceData> {
  const coinGeckoId = ASSET_TO_COINGECKO_ID[asset]
  if (!coinGeckoId) {
    throw new Error(`Unsupported asset: ${asset}`)
  }

  try {
    const response = await fetch(
      `${COINGECKO_API}/coins/${coinGeckoId}?localization=false&tickers=false&community_data=false&developer_data=false`,
    )

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`)
    }

    const data = await response.json()
    const marketData = data.market_data

    return {
      asset,
      price: marketData.current_price.usd,
      priceChange24h: marketData.price_change_24h,
      priceChangePercentage24h: marketData.price_change_percentage_24h,
      high24h: marketData.high_24h.usd,
      low24h: marketData.low_24h.usd,
      volume24h: marketData.total_volume.usd,
      marketCap: marketData.market_cap.usd,
      lastUpdated: Date.now(),
    }
  } catch (error) {
    console.error(`Failed to fetch price data for ${asset}:`, error)
    throw error
  }
}

// Get price history for charts
export async function getPriceHistory(asset: string, days = 1): Promise<Array<{ timestamp: number; price: number }>> {
  const coinGeckoId = ASSET_TO_COINGECKO_ID[asset]
  if (!coinGeckoId) {
    throw new Error(`Unsupported asset: ${asset}`)
  }

  try {
    const response = await fetch(`${COINGECKO_API}/coins/${coinGeckoId}/market_chart?vs_currency=usd&days=${days}`)

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`)
    }

    const data = await response.json()

    return data.prices.map(([timestamp, price]: [number, number]) => ({
      timestamp,
      price,
    }))
  } catch (error) {
    console.error(`Failed to fetch price history for ${asset}:`, error)
    throw error
  }
}
