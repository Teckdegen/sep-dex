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
import { Loader2, AlertTriangle, Info } from "lucide-react"
import type { SupportedAsset } from "@/lib/price-feed/types"
import type { PositionSide } from "@/lib/trading/types"
import { getStacksBalance } from "@/lib/blockchain/stacks"

interface TradingFormProps {
  userId: string
}

export function TradingForm({ userId }: TradingFormProps) {
  const { user, depositCollateral, getUserWalletBalance, getUserPrivateKey } = useAuth()
  const [asset, setAsset] = useState<SupportedAsset>("BTC")
  const [side, setSide] = useState<PositionSide>("long")
  const [leverage, setLeverage] = useState(10)
  const [collateral, setCollateral] = useState(100)
  const [walletBalance, setWalletBalance] = useState<number>(0)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const { price, isLoading: priceLoading } = usePrice(asset)

  useEffect(() => {
    async function loadWalletBalance() {
      if (user?.walletAddress) {
        try {
          const balance = await getStacksBalance(user.walletAddress)
          setWalletBalance(balance / 1_000_000) // Convert from microSTX to STX
        } catch (error) {
          console.error("[v0] Failed to load wallet balance:", error)
        }
      }
    }

    loadWalletBalance()
  }, [user?.walletAddress])

  // Refresh balance after successful position creation
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        if (user?.walletAddress) {
          getStacksBalance(user.walletAddress)
            .then(balance => setWalletBalance(balance / 1_000_000))
            .catch(console.error)
        }
      }, 2000) // Wait 2 seconds after success message
      return () => clearTimeout(timer)
    }
  }, [success, user?.walletAddress])

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

    // Prevent depositing less than 100 STX
    if (collateral < 100) {
      setError("Minimum collateral requirement is 100 STX. Please increase your collateral amount.")
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
      setCollateral(100) // Set to minimum allowed value
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
    <Card className="border-border bg-card p-6 shadow-lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-foreground">Asset</Label>
            <Select value={asset} onValueChange={(v) => setAsset(v as SupportedAsset)}>
              <SelectTrigger className="bg-background border-border">
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
            <Label className="text-foreground">Direction</Label>
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant={side === "long" ? "default" : "outline"}
                onClick={() => setSide("long")}
                className={`h-12 ${side === "long" ? "bg-success hover:bg-success/90 text-white" : "border-border hover:bg-success/10"}`}
              >
                Long
              </Button>
              <Button
                type="button"
                variant={side === "short" ? "default" : "outline"}
                onClick={() => setSide("short")}
                className={`h-12 ${side === "short" ? "bg-danger hover:bg-danger/90 text-white" : "border-border hover:bg-danger/10"}`}
              >
                Short
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="text-foreground">Leverage: {leverage}x</Label>
              <span className="text-sm text-muted-foreground">{leverage >= 25 ? "High Risk" : leverage >= 10 ? "Medium Risk" : "Low Risk"}</span>
            </div>
            <Input
              type="range"
              min="1"
              max="100"
              value={leverage}
              onChange={(e) => setLeverage(Number(e.target.value))}
              className="bg-background border-border"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-foreground">Collateral (STX)</Label>
            <Input
              type="number"
              value={collateral}
              onChange={(e) => setCollateral(Number(e.target.value))}
              min="100"
              step="1"
              className="bg-background border-border"
            />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Wallet Balance:</span>
              <span className="font-medium text-foreground">{walletBalance.toFixed(2)} STX</span>
            </div>
            {price && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Value:</span>
                <span className="font-medium text-foreground">${(collateral * price).toFixed(2)} USD</span>
              </div>
            )}
          </div>
        </div>

        {preview && (
          <Card className="border-border bg-secondary/50 p-4">
            <h3 className="font-semibold text-foreground mb-3 flex items-center">
              <Info className="h-4 w-4 mr-2" />
              Position Preview
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Entry Price:</span>
                <span className="font-medium text-foreground">${price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Position Size:</span>
                <span className="font-medium text-foreground">${preview.positionSize.toFixed(2)} USD</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Liquidation Price:</span>
                <span className="font-medium text-foreground">${preview.liquidationPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Potential PnL (1% move):</span>
                <span className="font-medium text-foreground">
                  ${(preview.positionSize * 0.01).toFixed(2)} USD
                </span>
              </div>
            </div>
          </Card>
        )}

        {leverage >= 25 && (
          <div className="flex items-start gap-2 rounded-lg bg-yellow-500/10 p-3 text-sm text-yellow-500 border border-yellow-500/30">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{getRiskWarning(leverage)}</span>
          </div>
        )}

        {error && <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-500 border border-red-500/30">{error}</div>}

        {success && <div className="rounded-lg bg-green-500/10 p-3 text-sm text-green-500 border border-green-500/30">{success}</div>}

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