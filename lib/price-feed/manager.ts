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

    // Level 2: Fetch from price feed (Binance primary, CoinGecko backup)
    const freshPrice = await this.fetchFromPriceFeed(asset)
    this.updateMemoryCache(asset, freshPrice)

    return freshPrice
  }

  async getPriceWithChange(asset: SupportedAsset): Promise<{ price: number; priceChangePercentage24h: number }> {
    // Level 1: Memory cache (fastest)
    const cached = this.memoryCache.get(asset)
    if (cached && Date.now() - cached.timestamp < this.MEMORY_CACHE_DURATION) {
      return {
        price: cached.price,
        priceChangePercentage24h: cached.priceChangePercentage24h,
      }
    }

    // Level 2: Fetch from price feed
    const binanceData = await this.fetchFromBinanceWithChange(asset)
    if (binanceData) {
      this.updateMemoryCache(asset, binanceData.price, binanceData.priceChangePercentage24h)
      return binanceData
    }

    // Fallback to CoinGecko (without change for now)
    const { getCurrentPrice } = await import('./coingecko')
    const price = await getCurrentPrice(asset)
    return { price, priceChangePercentage24h: 0 }
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
    // Use Binance for supported pairs, fallback to CoinGecko
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

      const response = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${binanceSymbol}`)
      if (!response.ok) {
        throw new Error(`Binance API error: ${response.status}`)
      }

      const data = await response.json()
      const price = parseFloat(data.lastPrice)
      const priceChangePercentage24h = parseFloat(data.priceChangePercent)

      // Cache both price and change
      this.updateMemoryCache(asset, price, priceChangePercentage24h)
      return price
    } catch (error) {
      console.error(`[v0] Binance fetch failed for ${asset}:`, error)
      return null
    }
  }

  private async fetchFromBinanceWithChange(asset: SupportedAsset): Promise<{ price: number; priceChangePercentage24h: number } | null> {
    try {
      const binanceSymbol = this.getBinanceSymbol(asset)
      if (!binanceSymbol) return null

      const response = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${binanceSymbol}`)
      if (!response.ok) {
        throw new Error(`Binance API error: ${response.status}`)
      }

      const data = await response.json()
      return {
        price: parseFloat(data.lastPrice),
        priceChangePercentage24h: parseFloat(data.priceChangePercent),
      }
    } catch (error) {
      console.error(`[v0] Binance fetch with change failed for ${asset}:`, error)
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

  private updateMemoryCache(asset: SupportedAsset, price: number, priceChangePercentage24h: number = 0): void {
    this.memoryCache.set(asset, {
      price,
      priceChangePercentage24h,
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