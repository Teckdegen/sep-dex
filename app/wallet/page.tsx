"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth/context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Send, RefreshCw, Copy, Check, Key, AlertTriangle, Wallet, TrendingUp, Shield, DollarSign, ArrowUpRight, ArrowDownLeft, Clock } from "lucide-react"
import { usePrice } from "@/lib/price-feed/hooks"
import { AppLayout } from "@/components/layout/app-layout"

export default function WalletPage() {
  const { user, isAuthenticated, isLoading, getUserPrivateKey } = useAuth()
  const router = useRouter()
  const [balance, setBalance] = useState<number>(0)
  const [isLoadingBalance, setIsLoadingBalance] = useState(true)
  const [isRequestingFaucet, setIsRequestingFaucet] = useState(false)
  const [faucetTxId, setFaucetTxId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Fetch STX price for USD conversion
  const { price: stxPrice, isLoading: stxPriceLoading, error: stxPriceError } = usePrice("STX")

  // Calculate USD value of STX balance
  const usdBalance = balance && stxPrice ? balance * stxPrice : 0
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [privateKeyCopied, setPrivateKeyCopied] = useState(false)

  // Send STX states
  const [recipientAddress, setRecipientAddress] = useState("")
  const [amount, setAmount] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [lastTxId, setLastTxId] = useState<string | null>(null)

  // Check if this is a local wallet
  const isLocalWallet = user?.subOrgId === "local-wallet"

  // Load balance when component mounts or user changes
  useEffect(() => {
    if (user?.walletAddress) {
      loadBalance()
    }
  }, [user?.walletAddress])

  function copyAddress() {
    if (user?.walletAddress) {
      navigator.clipboard.writeText(user.walletAddress)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

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

      // Get fresh balance before checking
      const currentBalance = await getStacksBalance(user.walletAddress)
      console.log("[v0] Current balance:", currentBalance, "STX")

      // Check if user has enough balance (amount is in STX, balance is in STX)
      if (amountFloat > currentBalance) {
        throw new Error("Insufficient balance")
      }

      // Get user's private key
      const userPrivateKey = getUserPrivateKey()

      console.log("[v0] Sending STX:", amountFloat, "STX to", recipientAddress)

      // Send STX using user's private key (amount is in STX, sendStx expects microSTX)
      const txId = await sendStx(Math.floor(amountFloat * 1_000_000), recipientAddress, userPrivateKey)

      setSuccess(`Transfer successful! Transaction ID: ${txId}`)
      setRecipientAddress("")
      setAmount("")
      setLastTxId(txId) // Track transaction to monitor status

      // Update balance after successful transfer
      setBalance(currentBalance - amountFloat)

      // Instead of immediately reloading balance, wait for transaction confirmation
      // The useEffect for lastTxId will handle balance updates
    } catch (err) {
      console.error("[v0] Transfer failed:", err)
      setError(err instanceof Error ? err.message : "Transfer failed")
    } finally {
      setIsSending(false)
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

      const response = await fetch('/api/faucet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address: user.walletAddress
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('[v0] API error response:', errorData)

        // Handle different error types from the API route
        if (response.status === 502) {
          throw new Error(`Faucet service unavailable: ${errorData.details || errorData.error}`)
        } else if (response.status === 503) {
          throw new Error(`Service unavailable: ${errorData.details || errorData.error}`)
        } else if (response.status === 504) {
          throw new Error(`Faucet request timed out: ${errorData.details || errorData.error}`)
        } else {
          throw new Error(errorData.error || `Faucet request failed: ${response.status}`)
        }
      }

      const data = await response.json()
      console.log("[v0] Faucet response:", data)

      // Set the transaction ID for monitoring
      if (data.data?.txId) {
        setFaucetTxId(data.data.txId)
        const method = data.method || 'unknown'
        const amount = data.data?.amount || 'faucet amount'
        setSuccess(`Request successful! Transaction ID: ${data.data.txId} (${method})`)

        // Monitor the transaction
        setLastTxId(data.data.txId)
      } else {
        setSuccess("Request submitted successfully!")
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
          <p className="text-gray-300 text-lg">Loading Wallet Interface...</p>
        </div>
      </div>
    )
  }

  return (
    <AppLayout walletAddress={user.walletAddress}>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="w-full">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Wallet className="h-8 w-8 text-blue-500 animate-bounce" />
              <h1 className="text-3xl font-bold text-white">My Wallet</h1>
            </div>
            <p className="text-gray-400">Secure Stacks wallet for managing your STX tokens</p>
          </div>

          {/* Main Balance Card */}
          <Card className="bg-gradient-to-r from-blue-600/20 to-green-600/20 backdrop-blur-sm border-gray-700 shadow-2xl mb-8">
            <CardContent className="p-8">
              <div className="text-center">
                <div className="mb-6">
                  <p className="text-gray-400 text-sm mb-2">Total Balance</p>
                  <div className="text-5xl font-bold text-white animate-pulse">
                    {isLoadingBalance ? (
                      <Loader2 className="h-16 w-16 animate-spin text-blue-500 mx-auto" />
                    ) : (
                      <div>
                        <div className="mb-2">
                          {balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} STX
                        </div>
                        <div className="text-2xl text-gray-300">
                          ≈ ${usdBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                        </div>
                      </div>
                    )}
                  </div>
                  {stxPrice && (
                    <p className="text-gray-400 text-sm mt-2">
                      STX Price: ${stxPrice.toFixed(4)} USD
                    </p>
                  )}
                </div>

                {/* Wallet Address */}
                <div className="p-4 bg-gray-700/50 rounded-lg mb-6">
                  <p className="text-gray-400 text-sm mb-2">Wallet Address</p>
                  <div className="flex items-center justify-center gap-2">
                    <code className="text-white text-sm break-all">{user.walletAddress}</code>
                    <Button size="sm" variant="outline" onClick={copyAddress} className="border-gray-600 hover:bg-gray-700">
                      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex justify-center gap-4">
                  <Button
                    onClick={forceRefreshBalance}
                    disabled={isLoadingBalance}
                    className="bg-blue-600 hover:bg-blue-700 hover:scale-105 transition-all duration-200"
                  >
                    <RefreshCw className={`mr-2 h-4 w-4 ${isLoadingBalance ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleRequestFaucet}
                    disabled={isRequestingFaucet}
                    className="border-gray-600 hover:bg-gray-700 hover:scale-105 transition-all duration-200"
                  >
                    {isRequestingFaucet ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Getting STX...
                      </>
                    ) : (
                      <>
                        <TrendingUp className="mr-2 h-4 w-4" />
                        Get STX
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs for Wallet Sections */}
          <Tabs defaultValue="send" className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-gray-800/50">
              <TabsTrigger value="send" className="flex items-center gap-2">
                <Send className="h-4 w-4" />
                Send
              </TabsTrigger>
              <TabsTrigger value="receive" className="flex items-center gap-2">
                <ArrowDownLeft className="h-4 w-4" />
                Receive
              </TabsTrigger>
              <TabsTrigger value="activity" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Activity
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                History
              </TabsTrigger>
            </TabsList>

            <TabsContent value="send" className="mt-6">
              <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700 shadow-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-xl font-semibold text-white">
                    <ArrowUpRight className="h-6 w-6 text-blue-500 animate-bounce" />
                    Send STX
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Transfer STX to another wallet address
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="recipient-address" className="text-gray-300">Recipient Address</Label>
                      <Input
                        id="recipient-address"
                        type="text"
                        placeholder="Enter recipient's STX address"
                        value={recipientAddress}
                        onChange={(e) => setRecipientAddress(e.target.value)}
                        disabled={isSending}
                        className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 hover:bg-gray-600 transition-all duration-200"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="amount" className="text-gray-300">Amount (STX)</Label>
                      <Input
                        id="amount"
                        type="number"
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        disabled={isSending}
                        className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600 transition-all duration-200"
                      />
                      <p className="text-xs text-gray-500">
                        Available: {balance.toFixed(2)} STX
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <Button
                      onClick={handleSendStx}
                      disabled={isSending || !recipientAddress || !amount}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 hover:scale-105 transition-all duration-200"
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

                    <Button
                      variant="outline"
                      onClick={() => {
                        setRecipientAddress("")
                        setAmount("")
                      }}
                      disabled={isSending}
                      className="border-gray-600 hover:bg-gray-700 hover:scale-105 transition-all duration-200"
                    >
                      Clear
                    </Button>
                  </div>

                  {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-lg">
                      <p className="text-red-400 text-sm">{error}</p>
                    </div>
                  )}

                  {success && (
                    <div className="p-4 bg-green-500/10 border border-green-500/50 rounded-lg">
                      <p className="text-green-400 text-sm">{success}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="receive" className="mt-6">
              <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700 shadow-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-xl font-semibold text-white">
                    <ArrowDownLeft className="h-6 w-6 text-green-500 animate-bounce" />
                    Receive STX
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Share your wallet address to receive STX from others
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="p-6 bg-gray-700/50 rounded-lg mb-6">
                      <p className="text-gray-400 text-sm mb-2">Your Wallet Address</p>
                      <code className="text-white text-lg break-all">{user.walletAddress}</code>
                    </div>
                    <Button onClick={copyAddress} className="bg-green-600 hover:bg-green-700 hover:scale-105 transition-all duration-200">
                      {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                      {copied ? "Copied!" : "Copy Address"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activity" className="mt-6">
              <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700 shadow-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-xl font-semibold text-white">
                    <TrendingUp className="h-6 w-6 text-blue-500 animate-bounce" />
                    Recent Activity
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    View your recent transactions and faucet requests
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {faucetTxId ? (
                    <div className="p-4 bg-blue-500/10 border border-blue-500/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <TrendingUp className="h-6 w-6 text-blue-500 animate-bounce" />
                        <div>
                          <p className="text-blue-400 font-medium">Faucet Request In Progress</p>
                          <p className="text-sm text-gray-300 mt-1">
                            Transaction ID: {faucetTxId}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-400 text-center">No recent activity</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="mt-6">
              <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700 shadow-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-xl font-semibold text-white">
                    <Clock className="h-6 w-6 text-blue-500 animate-bounce" />
                    Transaction History
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Complete record of all your wallet transactions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Sample transaction records */}
                    <div className="p-4 bg-green-500/10 border border-green-500/50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <ArrowDownLeft className="h-5 w-5 text-green-500" />
                          <div>
                            <p className="text-green-400 font-medium">Received STX</p>
                            <p className="text-sm text-gray-300">Faucet Request</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-bold">+500.00 STX</p>
                          <p className="text-sm text-gray-500">2 hours ago</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-blue-500/10 border border-blue-500/50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Send className="h-5 w-5 text-blue-500" />
                          <div>
                            <p className="text-blue-400 font-medium">Sent STX</p>
                            <p className="text-sm text-gray-300">To ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-bold">-100.00 STX</p>
                          <p className="text-sm text-gray-500">1 day ago</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-gray-700/50 border border-gray-600 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Wallet className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="text-gray-300 font-medium">Wallet Created</p>
                            <p className="text-sm text-gray-400">Initial Setup</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-bold">0.00 STX</p>
                          <p className="text-sm text-gray-500">1 week ago</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppLayout>
  )
}
