// Price feed integration with Binance as primary and CoinGecko as backup
import { savePriceCache, getCachedPrice } from "../storage/local-storage"

const COINGECKO_API = "https://api.coingecko.com/api/v3"
const BINANCE_API = "https://api.binance.com/api/v3"

// Binance symbols mapping (primary source)
const ASSET_TO_BINANCE_SYMBOL: Record<string, string> = {
  BTC: "BTCUSDT",
  ETH: "ETHUSDT",
  STX: "STXUSDT",
  SOL: "SOLUSDT",
  BNB: "BNBUSDT",
  ADA: "ADAUSDT",
  XRP: "XRPUSDT",
  DOGE: "DOGEUSDT",
  DOT: "DOTUSDT",
  LTC: "LTCUSDT",
  AVAX: "AVAXUSDT",
  MATIC: "MATICUSDT",
  UNI: "UNIUSDT",
  LINK: "LINKUSDT",
  BCH: "BCHUSDT",
}

// CoinGecko IDs (backup source)
const ASSET_TO_COINGECKO_ID: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  STX: "stacks",
  SOL: "solana",
  BNB: "binancecoin",
  ADA: "cardano",
  XRP: "ripple",
  DOGE: "dogecoin",
  DOT: "polkadot",
  LTC: "litecoin",
  AVAX: "avalanche-2",
  MATIC: "matic-network",
  UNI: "uniswap",
  LINK: "chainlink",
  BCH: "bitcoin-cash",
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

// Get current price (Binance primary, CoinGecko backup)
export async function getCurrentPrice(asset: string): Promise<number> {
  console.log(`[v0] Getting price for asset: ${asset}`)
  
  // Check cache first (5 minute cache to reduce API calls and avoid rate limits)
  const cached = getCachedPrice(asset, 300000)
  if (cached !== null) {
    console.log(`[v0] Using cached price for ${asset}: ${cached}`)
    return cached
  }

  // Try Binance first for all assets
  try {
    const binancePrice = await getPriceFromBinance(asset)
    if (binancePrice > 0) {
      savePriceCache(asset, binancePrice)
      console.log(`[v0] Using Binance price for ${asset}: ${binancePrice}`)
      return binancePrice
    }
  } catch (error) {
    console.error(`[v0] Binance API error for ${asset}:`, error)
  }

  // Fallback to CoinGecko for all supported assets
  const coinGeckoId = ASSET_TO_COINGECKO_ID[asset]
  if (!coinGeckoId) {
    console.error(`[v0] Unsupported asset: ${asset}`)
    return 0
  }

  try {
    console.log(`[v0] Fetching fresh price for ${asset} from CoinGecko (ID: ${coinGeckoId})`)
    const response = await fetch(`${COINGECKO_API}/simple/price?ids=${coinGeckoId}&vs_currencies=usd`)

    if (!response.ok) {
      console.error(`[v0] CoinGecko API error for ${asset}: ${response.status} ${response.statusText}`)
      return 0
    }

    const data = await response.json()
    console.log(`[v0] Raw response for ${asset}:`, data)
    
    const price = data[coinGeckoId]?.usd

    if (price === undefined || price === null) {
      console.error(`[v0] No price data for ${asset} (ID: ${coinGeckoId}). Response:`, data)
      return 0
    }

    // Cache the price
    savePriceCache(asset, price)
    console.log(`[v0] Cached fresh price for ${asset}: ${price}`)

    return price
  } catch (error) {
    console.error(`[v0] Failed to fetch price for ${asset}:`, error)
    return 0
  }
}

// Get price from Binance
async function getPriceFromBinance(asset: string): Promise<number> {
  const symbol = ASSET_TO_BINANCE_SYMBOL[asset]
  if (!symbol) {
    throw new Error(`Unsupported asset for Binance: ${asset}`)
  }

  try {
    const response = await fetch(`${BINANCE_API}/ticker/price?symbol=${symbol}`)
    
    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status}`)
    }

    const data = await response.json()
    const price = parseFloat(data.price)

    if (isNaN(price) || price <= 0) {
      throw new Error(`Invalid price data from Binance for ${asset}`)
    }

    return price
  } catch (error) {
    console.error(`Failed to fetch price from Binance for ${asset}:`, error)
    throw error
  }
}

// Get detailed price data (CoinGecko only)
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
    // Return default data instead of throwing error
    return {
      asset,
      price: 0,
      priceChange24h: 0,
      priceChangePercentage24h: 0,
      high24h: 0,
      low24h: 0,
      volume24h: 0,
      marketCap: 0,
      lastUpdated: Date.now(),
    }
  }
}

// Get price history (Binance primary with time-based data, CoinGecko backup)
export async function getPriceHistory(asset: string, days = 7): Promise<Array<{ timestamp: number; price: number }>> {
  // Try to get history from Binance first for all assets
  try {
    const binanceHistory = await getPriceHistoryFromBinance(asset, days)
    if (binanceHistory.length > 0) {
      console.log(`[v0] Using Binance history for ${asset}`)
      return binanceHistory
    }
  } catch (error) {
    console.error(`[v0] Binance history failed for ${asset}:`, error)
  }

  // Fallback to CoinGecko for all supported assets
  const coinGeckoId = ASSET_TO_COINGECKO_ID[asset]
  if (!coinGeckoId) {
    console.error(`[v0] Unsupported asset for history: ${asset}`)
    return []
  }

  try {
    console.log(`[v0] Fetching history for ${asset} from CoinGecko (ID: ${coinGeckoId})`)
    // Adjust interval based on days requested
    let interval = "daily"
    if (days <= 1) {
      interval = "hourly"
    } else if (days <= 7) {
      interval = "hourly"
    }

    const response = await fetch(`${COINGECKO_API}/coins/${coinGeckoId}/market_chart?vs_currency=usd&days=${days}&interval=${interval}`)

    if (!response.ok) {
      console.error(`[v0] CoinGecko history API error for ${asset}: ${response.status}`)
      return []
    }

    const data = await response.json()

    if (!data.prices || data.prices.length === 0) {
      console.error(`[v0] No history data for ${asset}`)
      return []
    }

    return data.prices.map(([timestamp, price]: [number, number]) => ({
      timestamp,
      price,
    }))
  } catch (error) {
    console.error(`[v0] Failed to fetch price history for ${asset}:`, error)
    return [] // Return empty array instead of throwing error
  }
}

// Get price history from Binance with time-based data
async function getPriceHistoryFromBinance(asset: string, days: number): Promise<Array<{ timestamp: number; price: number }>> {
  const symbol = ASSET_TO_BINANCE_SYMBOL[asset]
  if (!symbol) {
    throw new Error(`Unsupported asset for Binance: ${asset}`)
  }

  try {
    // Calculate time range
    const endTime = Date.now()
    const startTime = endTime - (days * 24 * 60 * 60 * 1000) // Convert days to milliseconds

    // Determine interval based on days
    let interval = "1d" // Default to daily
    if (days <= 1) {
      interval = "5m" // 5-minute intervals for 1 day
    } else if (days <= 7) {
      interval = "1h" // Hourly for 7 days or less
    } else if (days <= 30) {
      interval = "4h" // 4-hourly for 30 days or less
    }

    const response = await fetch(
      `${BINANCE_API}/klines?symbol=${symbol}&interval=${interval}&startTime=${startTime}&endTime=${endTime}&limit=1000`
    )

    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status}`)
    }

    const data = await response.json()

    // Parse klines data
    // Each kline is [openTime, open, high, low, close, volume, closeTime, ...]
    return data.map((kline: any) => ({
      timestamp: kline[0], // Open time
      price: parseFloat(kline[4]), // Close price
    }))
  } catch (error) {
    console.error(`Failed to fetch price history from Binance for ${asset}:`, error)
    throw error
  }
}
