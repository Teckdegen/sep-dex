"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth/context"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Wallet, ArrowDownToLine, ArrowUpFromLine, Copy, Check } from "lucide-react"
import { getUserBalance, getStacksBalance, sendStx } from "@/lib/blockchain/stacks"
import { depositStx, withdrawStx } from "@/lib/blockchain/stacks"

export default function WalletPage() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const [balance, setBalance] = useState<number>(0)
  const [isLoadingBalance, setIsLoadingBalance] = useState(true)
  const [depositAmount, setDepositAmount] = useState("")
  const [withdrawAmount, setWithdrawAmount] = useState("")
  const [recipientAddress, setRecipientAddress] = useState("")
  const [isDepositing, setIsDepositing] = useState(false)
  const [isWithdrawing, setIsWithdrawing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

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
    } finally {
      setIsLoadingBalance(false)
    }
  }

  async function handleDeposit() {
    if (!user?.walletAddress || !depositAmount) return

    try {
      setIsDepositing(true)
      setError(null)
      setSuccess(null)

      const amount = Number.parseFloat(depositAmount) * 1_000_000 // Convert to microSTX

      console.log("[v0] Depositing STX:", amount)

      // TODO: Get private key from Turnkey signing
      // For now, this will fail - need to implement Turnkey transaction signing
      const txId = await depositStx(amount, user.walletAddress, "")

      setSuccess(`Deposit successful! Transaction: ${txId}`)
      setDepositAmount("")
      await loadBalance()
    } catch (error) {
      console.error("[v0] Deposit failed:", error)
      setError(error instanceof Error ? error.message : "Deposit failed")
    } finally {
      setIsDepositing(false)
    }
  }

  async function handleWithdraw() {
    if (!user?.walletAddress || !withdrawAmount || !recipientAddress) return

    try {
      setIsWithdrawing(true)
      setError(null)
      setSuccess(null)

      const amount = Number.parseFloat(withdrawAmount) * 1_000_000 // Convert to microSTX

      console.log("[v0] Sending STX:", amount, "to", recipientAddress)

      // TODO: Get private key from Turnkey signing
      const txId = await sendStx(amount, recipientAddress, "")

      setSuccess(`Transfer successful! Transaction: ${txId}`)
      setWithdrawAmount("")
      setRecipientAddress("")
      await loadBalance()
    } catch (error) {
      console.error("[v0] Transfer failed:", error)
      setError(error instanceof Error ? error.message : "Transfer failed")
    } finally {
      setIsWithdrawing(false)
    }
  }

  function copyAddress() {
    if (user?.walletAddress) {
      navigator.clipboard.writeText(user.walletAddress)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
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
              <Button variant="outline" onClick={() => router.push("/charts")}>
                Charts
              </Button>
              <Button variant="outline" onClick={() => router.push("/trade")}>
                Go to Trading
              </Button>
            </div>
          </div>

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
                  This is your actual wallet balance. Deposit funds to start trading.
                </p>
              </div>
            </div>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-border bg-card p-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <ArrowDownToLine className="h-5 w-5 text-green-500" />
                  <h2 className="text-xl font-semibold text-foreground">Deposit</h2>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="deposit-amount">Amount (STX)</Label>
                  <Input
                    id="deposit-amount"
                    type="number"
                    placeholder="0.00"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    disabled={isDepositing}
                  />
                </div>

                <Button onClick={handleDeposit} disabled={isDepositing || !depositAmount} className="w-full">
                  {isDepositing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Depositing...
                    </>
                  ) : (
                    "Deposit STX"
                  )}
                </Button>

                <p className="text-xs text-muted-foreground">
                  Fund your in-app wallet with STX to start trading
                </p>
              </div>
            </Card>

            <Card className="border-border bg-card p-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <ArrowUpFromLine className="h-5 w-5 text-red-500" />
                  <h2 className="text-xl font-semibold text-foreground">Send STX</h2>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recipient-address">Recipient Address</Label>
                  <Input
                    id="recipient-address"
                    type="text"
                    placeholder="ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
                    value={recipientAddress}
                    onChange={(e) => setRecipientAddress(e.target.value)}
                    disabled={isWithdrawing}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="withdraw-amount">Amount (STX)</Label>
                  <Input
                    id="withdraw-amount"
                    type="number"
                    placeholder="0.00"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    disabled={isWithdrawing}
                  />
                </div>

                <Button
                  onClick={handleWithdraw}
                  disabled={isWithdrawing || !withdrawAmount || !recipientAddress}
                  variant="destructive"
                  className="w-full"
                >
                  {isWithdrawing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send STX"
                  )}
                </Button>

                <p className="text-xs text-muted-foreground">Send STX from your wallet to another address</p>
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