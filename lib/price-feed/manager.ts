import { getSupabaseBrowserClient } from "../supabase/client"
import { ASSET_TO_COINGECKO_ID, type SupportedAsset, type CachedPrice } from "./types"

class PriceFeedManager {
  private memoryCache: Map<SupportedAsset, CachedPrice> = new Map()
  private readonly CACHE_DURATION = 30000 // 30 seconds
  private readonly MEMORY_CACHE_DURATION = 2000 // 2 seconds

  async getPrice(asset: SupportedAsset): Promise<number> {
    // Level 1: Memory cache (fastest)
    const memoryPrice = this.getMemoryCachedPrice(asset)
    if (memoryPrice !== null) {
      return memoryPrice
    }

    // Level 2: Database cache
    const dbPrice = await this.getDatabaseCachedPrice(asset)
    if (dbPrice !== null) {
      this.updateMemoryCache(asset, dbPrice)
      return dbPrice
    }

    // Level 3: Fetch from CoinGecko
    const freshPrice = await this.fetchFromCoinGecko(asset)
    await this.updateAllCaches(asset, freshPrice)

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

  private async getDatabaseCachedPrice(asset: SupportedAsset): Promise<number | null> {
    try {
      const supabase = getSupabaseBrowserClient()

      const { data, error } = await supabase
        .from("price_feeds")
        .select("price, timestamp")
        .eq("symbol", asset)
        .eq("source", "coingecko")
        .order("timestamp", { ascending: false })
        .limit(1)
        .single()

      if (error || !data) return null

      const age = Date.now() - new Date(data.timestamp).getTime()
      if (age > this.CACHE_DURATION) return null

      return Number(data.price)
    } catch (error) {
      console.error("[v0] Database cache read failed:", error)
      return null
    }
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
      throw new Error(`Failed to fetch price for ${asset}`)
    }
  }

  private updateMemoryCache(asset: SupportedAsset, price: number): void {
    this.memoryCache.set(asset, {
      price,
      timestamp: Date.now(),
    })
  }

  private async updateAllCaches(asset: SupportedAsset, price: number): Promise<void> {
    // Update memory cache
    this.updateMemoryCache(asset, price)

    // Update database cache
    try {
      const supabase = getSupabaseBrowserClient()

      await supabase.from("price_feeds").insert({
        symbol: asset,
        price: price.toString(),
        source: "coingecko",
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      console.error("[v0] Database cache update failed:", error)
    }
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
    return this.getPrices(assets)
  }
}

export const priceFeedManager = new PriceFeedManager()
