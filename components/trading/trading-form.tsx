"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createPosition } from "@/lib/trading/position-manager"
import { computePosition, getRiskWarning } from "@/lib/trading/calculator"
import { Loader2, AlertTriangle } from "lucide-react"
import type { SupportedAsset } from "@/lib/price-feed/types"
import type { PositionSide } from "@/lib/trading/types"
import { useAuth } from "@/lib/auth/context"
import { usePrice } from "@/lib/price-feed/hooks"

interface TradingFormProps {
  userId: string
}

export function TradingForm({ userId }: TradingFormProps) {
  const { user, depositCollateral, getUserWalletBalance, getUserPrivateKey } = useAuth()
  const [asset, setAsset] = useState<SupportedAsset>("BTC")
  const [side, setSide] = useState<PositionSide>("long")
  const [leverage, setLeverage] = useState(10)
  const [collateral, setCollateral] = useState(100) // Changed from USD to STX
  const [walletBalance, setWalletBalance] = useState<number>(0)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const { price, isLoading: priceLoading } = usePrice(asset)

  useEffect(() => {
    async function loadWalletBalance() {
      if (user?.walletAddress) {
        try {
          const balance = await getUserWalletBalance()
          setWalletBalance(balance / 1_000_000) // Convert from microSTX to STX
        } catch (error) {
          console.error("[v0] Failed to load wallet balance:", error)
        }
      }
    }

    loadWalletBalance()
  }, [user, getUserWalletBalance])

  const preview = price
    ? computePosition({
        entry: price,
        price: price,
        collateral, // Use STX amount directly
        leverage,
        direction: side,
      })
    : null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!price) {
      setError("Price not available")
      return
    }

    if (!user?.walletAddress) {
      setError("Wallet not connected")
      return
    }

    // Validate collateral amount
    if (collateral > walletBalance) {
      setError(`Insufficient funds. Your wallet balance is ${walletBalance.toFixed(2)} STX.`)
      return
    }

    try {
      setIsCreating(true)
      setError(null)
      setSuccess(null)

      console.log("[v0] Creating position with collateral deposit")

      // Get user's private key
      const userPrivateKey = getUserPrivateKey();

      // Create position with user's private key
      await createPosition({
        userId,
        userAddress: user.walletAddress,
        symbol: asset,
        side,
        entryPrice: price,
        collateral, // Store STX amount directly
        leverage,
        privateKey: userPrivateKey
      });

      setSuccess("Position opened successfully!")

      // Reset form
      setCollateral(100)
      setLeverage(10)

      // Reload positions
      setTimeout(() => window.location.reload(), 1500)
    } catch (err) {
      console.error("[v0] Position creation error:", err)
      setError(err instanceof Error ? err.message : "Failed to create position")
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Card className="border-border bg-card p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label>Asset</Label>
          <Select value={asset} onValueChange={(v) => setAsset(v as SupportedAsset)}>
            <SelectTrigger className="bg-input">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="BTC">Bitcoin (BTC)</SelectItem>
              <SelectItem value="ETH">Ethereum (ETH)</SelectItem>
              <SelectItem value="STX">Stacks (STX)</SelectItem>
              <SelectItem value="SOL">Solana (SOL)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Direction</Label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={side === "long" ? "default" : "outline"}
              onClick={() => setSide("long")}
              className={side === "long" ? "bg-green-600 hover:bg-green-700" : ""}
            >
              Long
            </Button>
            <Button
              type="button"
              variant={side === "short" ? "default" : "outline"}
              onClick={() => setSide("short")}
              className={side === "short" ? "bg-red-600 hover:bg-red-700" : ""}
            >
              Short
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Leverage: {leverage}x</Label>
          <Input
            type="range"
            min="1"
            max="100"
            value={leverage}
            onChange={(e) => setLeverage(Number(e.target.value))}
            className="bg-input"
          />
        </div>

        <div className="space-y-2">
          <Label>Collateral (STX)</Label>
          <Input
            type="number"
            value={collateral}
            onChange={(e) => setCollateral(Number(e.target.value))}
            min="1"
            step="1"
            className="bg-input"
          />
          <div className="text-sm text-muted-foreground">
            Wallet Balance: {walletBalance.toFixed(2)} STX
          </div>
          {price && (
            <div className="text-sm text-muted-foreground">
              Value: ${(collateral * price).toFixed(2)} USD
            </div>
          )}
        </div>

        {preview && (
          <div className="space-y-2 rounded-lg bg-secondary p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Entry Price:</span>
              <span className="font-medium text-foreground">${price?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Position Size:</span>
              <span className="font-medium text-foreground">${preview.positionSize.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Liquidation Price:</span>
              <span className="font-medium text-foreground">${preview.liquidationPrice.toLocaleString()}</span>
            </div>
          </div>
        )}

        {leverage >= 25 && (
          <div className="flex items-start gap-2 rounded-lg bg-yellow-500/10 p-3 text-sm text-yellow-500">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{getRiskWarning(leverage)}</span>
          </div>
        )}

        {error && <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-500">{error}</div>}

        {success && <div className="rounded-lg bg-green-500/10 p-3 text-sm text-green-500">{success}</div>}

        <Button type="submit" disabled={isCreating || priceLoading || !price} className="w-full" size="lg">
          {isCreating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Opening Position...
            </>
          ) : (
            "Open Position"
          )}
        </Button>
      </form>
    </Card>
  )
}