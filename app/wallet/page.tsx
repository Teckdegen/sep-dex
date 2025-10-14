"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth/context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Send, RefreshCw, Copy, Check } from "lucide-react"
import { getStacksBalance, sendStx } from "@/lib/blockchain/stacks"
import { AppLayout } from "@/components/layout/app-layout"

export default function WalletPage() {
  const { user, isAuthenticated, isLoading, getUserPrivateKey } = useAuth()
  const router = useRouter()
  const [balance, setBalance] = useState<number>(0)
  const [isLoadingBalance, setIsLoadingBalance] = useState(true)
  const [isRequestingFaucet, setIsRequestingFaucet] = useState(false)
  const [faucetTxId, setFaucetTxId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Send STX states
  const [recipientAddress, setRecipientAddress] = useState("")
  const [amount, setAmount] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [lastTxId, setLastTxId] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/auth/login")
    }
  }, [isAuthenticated, isLoading, router])

  useEffect(() => {
    if (user?.walletAddress) {
      loadBalance()
      
      // Set up automatic balance refresh every 2 minutes (120000 ms)
      const balanceInterval = setInterval(loadBalance, 120000)
      
      // Clean up interval on component unmount
      return () => clearInterval(balanceInterval)
    }
  }, [user])

  // Effect to monitor transaction status
  useEffect(() => {
    if (lastTxId) {
      // Check transaction status and update balance when confirmed
      const checkTxStatus = async () => {
        try {
          const response = await fetch(`https://stacks-node-api.testnet.stacks.co/extended/v1/tx/${lastTxId}`)
          const data = await response.json()
          
          console.log("[v0] Transaction status:", data.tx_status)
          
          if (data.tx_status === 'success') {
            // Transaction confirmed, refresh balance
            console.log("[v0] Transaction confirmed, refreshing balance")
            await forceRefreshBalance()
            setLastTxId(null)
          } else if (data.tx_status === 'abort_by_response' || data.tx_status === 'abort_by_post_condition') {
            // Transaction failed, stop checking
            console.log("[v0] Transaction failed, stopping monitoring")
            setLastTxId(null)
          }
          // For pending status, we'll check again
        } catch (error) {
          console.error("[v0] Failed to check transaction status:", error)
        }
      }
      
      // Check transaction status every 5 seconds
      const txInterval = setInterval(checkTxStatus, 5000)
      
      // Clean up interval after 2 minutes (maximum wait time)
      const timeout = setTimeout(() => {
        console.log("[v0] Transaction monitoring timeout, forcing balance refresh")
        clearInterval(txInterval)
        clearTimeout(timeout)
        setLastTxId(null)
        // Force a balance refresh even if we didn't get confirmation
        forceRefreshBalance()
      }, 120000)
      
      return () => {
        clearInterval(txInterval)
        clearTimeout(timeout)
      }
    }
  }, [lastTxId])

  async function loadBalance() {
    if (!user?.walletAddress) {
      console.log("[v0] No wallet address available for balance check")
      return
    }

    console.log("[v0] Loading balance for address:", user.walletAddress)
    
    try {
      setIsLoadingBalance(true)
      setError(null)
      const stacksBalance = await getStacksBalance(user.walletAddress)
      console.log("[v0] Setting balance state to:", stacksBalance)
      setBalance(stacksBalance)
    } catch (error) {
      console.error("[v0] Failed to load balance:", error)
      setError(error instanceof Error ? error.message : "Failed to load balance")
    } finally {
      setIsLoadingBalance(false)
    }
  }

  // Add a force refresh function
  async function forceRefreshBalance() {
    // Add a small delay to ensure any pending transactions are processed
    await new Promise(resolve => setTimeout(resolve, 2000))
    await loadBalance()
  }

  function copyAddress() {
    if (user?.walletAddress) {
      navigator.clipboard.writeText(user.walletAddress)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  async function handleRequestFaucet() {
    if (!user?.walletAddress) {
      setError("No wallet address available")
      return
    }

    try {
      setIsRequestingFaucet(true)
      setError(null)
      setSuccess(null)

      console.log("[v0] Requesting STX from faucet for address:", user.walletAddress)

      const response = await fetch(
        `https://api.testnet.stacks.co/extended/v1/faucets/stx?address=${user.walletAddress}&stacking=false`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )

      if (!response.ok) {
        throw new Error(`Faucet request failed: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      console.log("[v0] Faucet response:", data)

      // Set the transaction ID for monitoring
      if (data.txId) {
        setFaucetTxId(data.txId)
        setSuccess(`Faucet request successful! Transaction ID: ${data.txId}`)

        // Monitor the faucet transaction
        setLastTxId(data.txId)
      } else {
        setSuccess("Faucet request submitted successfully!")
      }

      // Refresh balance after a short delay
      setTimeout(() => {
        forceRefreshBalance()
      }, 2000)

    } catch (err) {
      console.error("[v0] Faucet request failed:", err)
      setError(err instanceof Error ? err.message : "Faucet request failed")
    } finally {
      setIsRequestingFaucet(false)
    }
  }

  if (isLoading || !user || !user.walletAddress) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <AppLayout walletAddress={user.walletAddress}>
      <div className="container mx-auto py-8 px-4">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Wallet Dashboard</h1>
            <p className="text-muted-foreground">Manage your STX tokens and trading positions</p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {/* Wallet Overview */}
            <div className="md:col-span-1 space-y-6">
              <Card className="border-border bg-card shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Copy className="h-5 w-5 text-primary" />
                    Wallet Information
                  </CardTitle>
                  <CardDescription>Your Stacks wallet details and balance</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Wallet Address</Label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-sm bg-muted p-2 rounded break-all">
                        {user.walletAddress.slice(0, 6)}...{user.walletAddress.slice(-4)}
                      </code>
                      <Button size="sm" variant="outline" onClick={copyAddress}>
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Available Balance</Label>
                      <div className="flex items-center gap-2">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={forceRefreshBalance}
                          disabled={isLoadingBalance}
                        >
                          <RefreshCw className={`h-4 w-4 ${isLoadingBalance ? 'animate-spin' : ''}`} />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleRequestFaucet}
                          disabled={isRequestingFaucet}
                          className="text-xs"
                        >
                          {isRequestingFaucet ? (
                            <>
                              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                              Requesting...
                            </>
                          ) : (
                            "Request STX"
                          )}
                        </Button>
                      </div>
                    </div>
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="text-3xl font-bold text-foreground">
                        {isLoadingBalance ? (
                          <Loader2 className="h-8 w-8 animate-spin" />
                        ) : (
                          `${balance.toFixed(2)} STX`
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Automatically updates every 2 minutes
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Send STX Form */}
            <div className="md:col-span-2">
              <Card className="border-border bg-card shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Send className="h-5 w-5 text-primary" />
                    Send STX
                  </CardTitle>
                  <CardDescription>Transfer STX tokens to another wallet address</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="grid gap-6 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="recipient-address">Recipient Address</Label>
                        <Input
                          id="recipient-address"
                          type="text"
                          placeholder="ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
                          value={recipientAddress}
                          onChange={(e) => setRecipientAddress(e.target.value)}
                          disabled={isSending}
                          className="bg-background border-border"
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
                          className="bg-background border-border"
                        />
                        <p className="text-xs text-muted-foreground">
                          Available: {balance.toFixed(2)} STX
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button
                        onClick={handleSendStx}
                        disabled={isSending || !recipientAddress || !amount}
                        size="lg"
                        className="flex-1 bg-primary hover:bg-primary/90"
                      >
                        {isSending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Sending STX...
                          </>
                        ) : (
                          <>
                            <Send className="mr-2 h-4 w-4" />
                            Send STX
                          </>
                        )}
                      </Button>
                      
                      <Button
                        variant="outline"
                        onClick={() => {
                          setRecipientAddress("")
                          setAmount("")
                        }}
                        size="lg"
                        disabled={isSending}
                        className="flex-1 border-border hover:bg-secondary"
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Faucet Status */}
              {faucetTxId && (
                <Card className="border-blue-500/50 bg-blue-500/10 mt-6 shadow">
                  <CardContent className="p-4">
                    <p className="text-sm text-blue-500">Faucet request in progress...</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Transaction ID: {faucetTxId}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Wallet Address Full View */}
              <Card className="border-border bg-card mt-6 shadow">
                <CardHeader>
                  <CardTitle>Full Wallet Address</CardTitle>
                  <CardDescription>Complete wallet address for receiving funds</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-sm bg-muted p-3 rounded break-all">
                      {user.walletAddress}
                    </code>
                    <Button size="sm" variant="outline" onClick={copyAddress}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}