import { NextResponse } from "next/server"
import { priceFeedManager } from "@/lib/price-feed/manager"
import type { SupportedAsset } from "@/lib/price-feed/types"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const asset = searchParams.get("asset") as SupportedAsset | null

    if (asset) {
      const price = await priceFeedManager.getPrice(asset)
      return NextResponse.json({ asset, price, timestamp: Date.now() })
    }

    const prices = await priceFeedManager.getAllPrices()
    return NextResponse.json({ prices, timestamp: Date.now() })
  } catch (error) {
    console.error("[v0] Price API error:", error)
    return NextResponse.json({ error: "Failed to fetch prices" }, { status: 500 })
  }
}
