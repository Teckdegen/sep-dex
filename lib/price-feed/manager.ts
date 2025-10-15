import { type SupportedAsset, type CachedPrice } from "./types"

class PriceFeedManager {
  private memoryCache: Map<SupportedAsset, CachedPrice> = new Map()
  private readonly MEMORY_CACHE_DURATION = 300000 // 5 minutes

  async getPrice(asset: SupportedAsset): Promise<number> {
    // Level 1: Memory cache (fastest)
    const memoryPrice = this.getMemoryCachedPrice(asset)
    if (memoryPrice !== null) {
      return memoryPrice
    }

    // Level 2: Fetch from price feed (Binance for supported pairs, CoinGecko backup)
    const freshPrice = await this.fetchFromPriceFeed(asset)
    this.updateMemoryCache(asset, freshPrice)

    return freshPrice
  }

  private getMemoryCachedPrice(asset: SupportedAsset): number | null {
    const cached = this.memoryCache.get(asset)
    if (!cached) return null

    const age = Date.now() - cached.timestamp
    if (age > this.MEMORY_CACHE_DURATION) {
      this.memoryCache.delete(asset)
      return null
    }

    return cached.price
  }

  private async fetchFromPriceFeed(asset: SupportedAsset): Promise<number> {
    // Use Binance API for supported USDT pairs, CoinGecko as backup
    const binancePrice = await this.fetchFromBinance(asset)
    if (binancePrice !== null) {
      return binancePrice
    }

    // Fallback to CoinGecko if Binance fails
    const { getCurrentPrice } = await import('./coingecko')
    return getCurrentPrice(asset)
  }

  private async fetchFromBinance(asset: SupportedAsset): Promise<number | null> {
    try {
      // Map asset to Binance symbol (e.g., BTC -> BTCUSDT)
      const binanceSymbol = this.getBinanceSymbol(asset)
      if (!binanceSymbol) return null

      const response = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${binanceSymbol}`)
      if (!response.ok) {
        throw new Error(`Binance API error: ${response.status}`)
      }

      const data = await response.json()
      return parseFloat(data.price)
    } catch (error) {
      console.error(`[v0] Binance fetch failed for ${asset}:`, error)
      return null
    }
  }

  private getBinanceSymbol(asset: SupportedAsset): string | null {
    // Map to Binance USDT pairs
    const symbolMap: Record<SupportedAsset, string> = {
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

    return symbolMap[asset] || null
  }

  private updateMemoryCache(asset: SupportedAsset, price: number): void {
    this.memoryCache.set(asset, {
      price,
      timestamp: Date.now(),
    })
  }

  async getPrices(assets: SupportedAsset[]): Promise<Record<SupportedAsset, number>> {
    const prices = await Promise.all(assets.map((asset) => this.getPrice(asset)))

    return assets.reduce(
      (acc, asset, index) => {
        acc[asset] = prices[index]
        return acc
      },
      {} as Record<SupportedAsset, number>,
    )
  }

  async getAllPrices(): Promise<Record<SupportedAsset, number>> {
    const assets: SupportedAsset[] = [
      "BTC", "ETH", "STX", "SOL",
      "BNB", "ADA", "XRP", "DOGE", "DOT",
      "LTC", "AVAX", "MATIC", "UNI", "LINK", "BCH"
    ]
    try {
      return await this.getPrices(assets)
    } catch (error) {
      console.error("[v0] Failed to fetch all prices:", error)
      // Return default prices instead of throwing an error to prevent the UI from breaking
      return {
        BTC: 0, ETH: 0, STX: 0, SOL: 0,
        BNB: 0, ADA: 0, XRP: 0, DOGE: 0, DOT: 0,
        LTC: 0, AVAX: 0, MATIC: 0, UNI: 0, LINK: 0, BCH: 0,
      }
    }
  }
}

export const priceFeedManager = new PriceFeedManager()