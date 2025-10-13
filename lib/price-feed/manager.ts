import { ASSET_TO_COINGECKO_ID, type SupportedAsset, type CachedPrice } from "./types"

class PriceFeedManager {
  private memoryCache: Map<SupportedAsset, CachedPrice> = new Map()
  private readonly MEMORY_CACHE_DURATION = 2000 // 2 seconds

  async getPrice(asset: SupportedAsset): Promise<number> {
    // Level 1: Memory cache (fastest)
    const memoryPrice = this.getMemoryCachedPrice(asset)
    if (memoryPrice !== null) {
      return memoryPrice
    }

    // Level 2: Fetch from CoinGecko
    const freshPrice = await this.fetchFromCoinGecko(asset)
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

  private async fetchFromCoinGecko(asset: SupportedAsset): Promise<number> {
    const coinGeckoId = ASSET_TO_COINGECKO_ID[asset]

    try {
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${coinGeckoId}&vs_currencies=usd`,
        {
          headers: {
            Accept: "application/json",
          },
        },
      )

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`)
      }

      const data = await response.json()
      const price = data[coinGeckoId]?.usd

      if (!price) {
        throw new Error(`Price not found for ${asset}`)
      }

      return price
    } catch (error) {
      console.error("[v0] CoinGecko fetch failed:", error)
      // Return a default price instead of throwing an error to prevent the UI from breaking
      return 0
    }
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
    const assets: SupportedAsset[] = ["BTC", "ETH", "STX", "SOL"]
    try {
      return await this.getPrices(assets)
    } catch (error) {
      console.error("[v0] Failed to fetch all prices:", error)
      // Return default prices instead of throwing an error to prevent the UI from breaking
      return {
        BTC: 0,
        ETH: 0,
        STX: 0,
        SOL: 0,
      }
    }
  }
}

export const priceFeedManager = new PriceFeedManager()