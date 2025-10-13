"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth/context"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

export default function HomePage() {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push("/trade")
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-border bg-card p-8">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-bold text-foreground">SEP DEX</h1>
          <p className="text-muted-foreground">Perpetual Futures Trading Platform</p>
        </div>

        <div className="space-y-4">
          <Button onClick={() => router.push("/auth/login")} className="w-full" size="lg">
            Connect Wallet
          </Button>

          <div className="space-y-2 rounded-lg bg-secondary p-4">
            <h3 className="font-semibold text-foreground">Supported Assets</h3>
            <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
              <div>• Bitcoin (BTC)</div>
              <div>• Ethereum (ETH)</div>
              <div>• Stacks (STX)</div>
              <div>• Solana (SOL)</div>
            </div>
          </div>

          <div className="space-y-2 rounded-lg bg-secondary p-4">
            <h3 className="font-semibold text-foreground">Features</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>• Up to 100x leverage</li>
              <li>• Real-time price feeds</li>
              <li>• Turnkey wallet integration</li>
              <li>• Automatic liquidation protection</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  )
}