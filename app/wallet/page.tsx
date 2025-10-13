"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth/context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Wallet, Copy, Check, Send, RefreshCw } from "lucide-react"
import { getStacksBalance, sendStx } from "@/lib/blockchain/stacks"

export default function WalletPage() {
  const { user, isAuthenticated, isLoading, getUserPrivateKey, logout } = useAuth()
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
  const [lastTxId, setLastTxId] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/auth/login")
    }
  }, [isAuthenticated, isLoading, router])

  useEffect(() => {
    if (user?.walletAddress) {
      loadBalance()
      
      // Set up automatic balance refresh every 10 seconds
      const balanceInterval = setInterval(loadBalance, 10000)
      
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
          
          if (data.tx_status === 'success') {
            // Transaction confirmed, refresh balance
            await loadBalance()
            setLastTxId(null)
          } else if (data.tx_status === 'abort_by_response' || data.tx_status === 'abort_by_post_condition') {
            // Transaction failed, stop checking
            setLastTxId(null)
          }
          // For pending status, we'll check again
        } catch (error) {
          console.error("Failed to check transaction status:", error)
        }
      }
      
      // Check transaction status every 5 seconds
      const txInterval = setInterval(checkTxStatus, 5000)
      
      // Clean up interval after 2 minutes (maximum wait time)
      const timeout = setTimeout(() => {
        clearInterval(txInterval)
        setLastTxId(null)
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
      setLastTxId(txId) // Track transaction to monitor status
      
      // Reload balance immediately after successful transfer
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
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Wallet Dashboard</h1>
              <p className="text-muted-foreground">Manage your STX tokens and trading positions</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => router.push("/positions")} className="w-full sm:w-auto">
                Positions
              </Button>
              <Button variant="outline" onClick={() => router.push("/charts")} className="w-full sm:w-auto">
                Charts
              </Button>
              <Button variant="outline" onClick={() => router.push("/trade")} className="w-full sm:w-auto">
                Trading
              </Button>
              <Button variant="outline" onClick={() => router.push("/debug")} className="w-full sm:w-auto">
                Debug
              </Button>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {/* Wallet Overview */}
            <div className="md:col-span-1 space-y-6">
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-primary" />
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
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={loadBalance}
                        disabled={isLoadingBalance}
                      >
                        <RefreshCw className={`h-4 w-4 ${isLoadingBalance ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="text-3xl font-bold text-foreground">
                        {isLoadingBalance ? (
                          <Loader2 className="h-8 w-8 animate-spin" />
                        ) : (
                          `${(balance / 1_000_000).toFixed(2)} STX`
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Automatically updates every 10 seconds
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Send className="h-5 w-5 text-primary" />
                    Quick Actions
                  </CardTitle>
                  <CardDescription>Access other parts of the platform</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-2">
                  <Button variant="outline" onClick={() => router.push("/trade")}>
                    Trade
                  </Button>
                  <Button variant="outline" onClick={() => router.push("/positions")}>
                    Positions
                  </Button>
                  <Button variant="outline" onClick={() => router.push("/charts")}>
                    Charts
                  </Button>
                  <Button variant="outline" onClick={logout}>
                    Logout
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Send STX Form */}
            <div className="md:col-span-2">
              <Card className="border-border bg-card">
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
                        <p className="text-xs text-muted-foreground">
                          Available: {(balance / 1_000_000).toFixed(2)} STX
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button
                        onClick={handleSendStx}
                        disabled={isSending || !recipientAddress || !amount}
                        size="lg"
                        className="flex-1"
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
                        className="flex-1"
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Transaction Status */}
              {error && (
                <Card className="border-destructive/50 bg-destructive/10 mt-6">
                  <CardContent className="p-4">
                    <p className="text-sm text-destructive">{error}</p>
                  </CardContent>
                </Card>
              )}

              {success && (
                <Card className="border-green-500/50 bg-green-500/10 mt-6">
                  <CardContent className="p-4">
                    <p className="text-sm text-green-500">{success}</p>
                    {lastTxId && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Monitoring transaction status...
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Wallet Address Full View */}
              <Card className="border-border bg-card mt-6">
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
    </div>
  )
}