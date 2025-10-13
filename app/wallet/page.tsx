"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth/context"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Wallet, Copy, Check, Send } from "lucide-react"
import { getStacksBalance, sendStx } from "@/lib/blockchain/stacks"

export default function WalletPage() {
  const { user, isAuthenticated, isLoading, getUserPrivateKey } = useAuth()
  const router = useRouter()
  const [balance, setBalance] = useState<number>(0)
  const [isLoadingBalance, setIsLoadingBalance] = useState(true)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // Send STX states
  const [recipientAddress, setRecipientAddress] = useState("")
  const [amount, setAmount] = useState("")
  const [isSending, setIsSending] = useState(false)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/auth/login")
    }
  }, [isAuthenticated, isLoading, router])

  useEffect(() => {
    if (user?.walletAddress) {
      loadBalance()
    }
  }, [user])

  async function loadBalance() {
    if (!user?.walletAddress) return

    try {
      setIsLoadingBalance(true)
      const stacksBalance = await getStacksBalance(user.walletAddress)
      setBalance(stacksBalance)
    } catch (error) {
      console.error("[v0] Failed to load balance:", error)
      setError(error instanceof Error ? error.message : "Failed to load balance")
    } finally {
      setIsLoadingBalance(false)
    }
  }

  function copyAddress() {
    if (user?.walletAddress) {
      navigator.clipboard.writeText(user.walletAddress)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  async function handleSendStx() {
    if (!user?.walletAddress || !recipientAddress || !amount) {
      setError("Please fill in all fields")
      return
    }

    try {
      setIsSending(true)
      setError(null)
      setSuccess(null)

      // Validate amount
      const amountFloat = parseFloat(amount)
      if (isNaN(amountFloat) || amountFloat <= 0) {
        throw new Error("Invalid amount")
      }

      // Check if user has enough balance
      const amountMicroStx = Math.floor(amountFloat * 1_000_000)
      if (amountMicroStx > balance) {
        throw new Error("Insufficient balance")
      }

      // Get user's private key
      const userPrivateKey = getUserPrivateKey()

      console.log("[v0] Sending STX:", amountMicroStx, "to", recipientAddress)

      // Send STX using user's private key
      const txId = await sendStx(amountMicroStx, recipientAddress, userPrivateKey)

      setSuccess(`Transfer successful! Transaction ID: ${txId}`)
      setRecipientAddress("")
      setAmount("")
      
      // Reload balance
      await loadBalance()
    } catch (err) {
      console.error("[v0] Transfer failed:", err)
      setError(err instanceof Error ? err.message : "Transfer failed")
    } finally {
      setIsSending(false)
    }
  }

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-foreground">Wallet</h1>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => router.push("/positions")}>
                Positions
              </Button>
              <Button variant="outline" onClick={() => router.push("/charts")}>
                Charts
              </Button>
              <Button variant="outline" onClick={() => router.push("/trade")}>
                Go to Trading
              </Button>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Wallet Info */}
            <Card className="border-border bg-card p-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-semibold text-foreground">Wallet Address</h2>
                </div>

                <div className="flex items-center gap-2 rounded-lg bg-muted p-3">
                  <code className="flex-1 text-sm text-foreground">{user.walletAddress}</code>
                  <Button size="sm" variant="ghost" onClick={copyAddress}>
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>

                <div className="rounded-lg border border-border bg-muted/50 p-4">
                  <p className="text-sm text-muted-foreground">Available Balance</p>
                  <p className="text-3xl font-bold text-foreground">
                    {isLoadingBalance ? (
                      <Loader2 className="h-8 w-8 animate-spin" />
                    ) : (
                      `${(balance / 1_000_000).toFixed(2)} STX`
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    This is your actual wallet balance. You can trade directly from this balance.
                  </p>
                </div>
              </div>
            </Card>

            {/* Send STX Form */}
            <Card className="border-border bg-card p-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Send className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-semibold text-foreground">Send STX</h2>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="recipient-address">Recipient Address</Label>
                    <Input
                      id="recipient-address"
                      type="text"
                      placeholder="ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
                      value={recipientAddress}
                      onChange={(e) => setRecipientAddress(e.target.value)}
                      disabled={isSending}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount (STX)</Label>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      disabled={isSending}
                    />
                  </div>

                  <Button
                    onClick={handleSendStx}
                    disabled={isSending || !recipientAddress || !amount}
                    className="w-full"
                  >
                    {isSending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Send STX
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-lg border border-green-500/50 bg-green-500/10 p-4 text-sm text-green-500">
              {success}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}