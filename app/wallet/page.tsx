"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth/context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Loader2, Send, RefreshCw, Copy, Check, Key, AlertTriangle, Wallet, TrendingUp, Shield, DollarSign } from "lucide-react"
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
        <div className="container mx-auto">
          {/* Header with Balance at Top */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold text-white mb-2 animate-pulse">Wallet Dashboard</h1>
                <p className="text-gray-400 text-lg">Securely manage your STX tokens and transactions</p>
              </div>
              <Badge variant="outline" className="bg-green-600/10 border-green-500 text-green-400 px-4 py-2 animate-bounce">
                <Shield className="h-4 w-4 mr-2" />
                Secure Wallet
              </Badge>
            </div>
          </div>

          {/* Main Balance Display */}
          <div className="mb-8">
            <Card className="bg-gradient-to-r from-blue-600/20 to-green-600/20 backdrop-blur-sm border-gray-700 shadow-2xl">
              <CardContent className="p-8">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm mb-2">Available Balance</p>
                    <div className="text-6xl font-bold text-white animate-pulse">
                      {isLoadingBalance ? (
                        <Loader2 className="h-16 w-16 animate-spin text-blue-500" />
                      ) : (
                        `${balance.toFixed(2)} STX`
                      )}
                    </div>
                    <p className="text-gray-500 mt-2">≈ $ {(balance * 2.5).toFixed(2)} USD</p>
                  </div>
                  <div className="text-right">
                    <div className="p-4 bg-white/10 rounded-full mb-4">
                      <Wallet className="h-12 w-12 text-blue-500" />
                    </div>
                    <Button
                      onClick={forceRefreshBalance}
                      disabled={isLoadingBalance}
                      className="bg-blue-600 hover:bg-blue-700 hover:scale-105 transition-all duration-200"
                    >
                      <RefreshCw className={`mr-2 h-4 w-4 ${isLoadingBalance ? 'animate-spin' : ''}`} />
                      Refresh Balance
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {/* Wallet Overview */}
            <div className="md:col-span-1 space-y-6">
              <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700 shadow-2xl hover:shadow-3xl transition-all duration-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-xl font-semibold text-white">
                    <Wallet className="h-6 w-6 text-blue-500 animate-bounce" />
                    Wallet Information
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Your Stacks wallet details and current balance
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-gray-300">Wallet Address</Label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-sm bg-gray-700 p-3 rounded-lg break-all text-gray-100">
                        {user.walletAddress.slice(0, 6)}...{user.walletAddress.slice(-4)}
                      </code>
                      <Button size="sm" variant="outline" onClick={copyAddress} className="border-gray-600 hover:bg-gray-700 hover:scale-105 transition-all duration-200">
                        {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-gray-300">Quick Actions</Label>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleRequestFaucet}
                        disabled={isRequestingFaucet}
                        className="text-xs border-gray-600 hover:bg-gray-700 hover:scale-105 transition-all duration-200"
                      >
                        {isRequestingFaucet ? (
                          <>
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                            Requesting...
                          </>
                        ) : (
                          <>
                            <TrendingUp className="mr-1 h-3 w-3" />
                            Get STX
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Send STX Form */}
            <div className="md:col-span-2">
              <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700 shadow-2xl hover:shadow-3xl transition-all duration-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-xl font-semibold text-white">
                    <Send className="h-6 w-6 text-blue-500 animate-bounce" />
                    Send STX
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Transfer STX tokens to another Stacks address
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="grid gap-6 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="recipient-address" className="text-gray-300">Recipient Address</Label>
                        <Input
                          id="recipient-address"
                          type="text"
                          placeholder="ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
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

                    <div className="flex flex-col sm:flex-row gap-4">
                      <Button
                        onClick={handleSendStx}
                        disabled={isSending || !recipientAddress || !amount}
                        size="lg"
                        className="flex-1 bg-blue-600 hover:bg-blue-700 hover:scale-105 transition-all duration-200 animate-pulse"
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
                        className="flex-1 border-gray-600 hover:bg-gray-700 hover:scale-105 transition-all duration-200"
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Faucet Status */}
              {faucetTxId && (
                <Card className="bg-blue-500/10 border-blue-500/50 mt-6 shadow-2xl animate-pulse">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <TrendingUp className="h-6 w-6 text-blue-500 animate-bounce" />
                      <div>
                        <p className="text-blue-400 font-medium">Faucet Request In Progress</p>
                        <p className="text-sm text-gray-300 mt-1">
                          Transaction ID: {faucetTxId}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Full Wallet Address */}
              <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700 mt-6 shadow-2xl hover:shadow-3xl transition-all duration-200">
                <CardHeader>
                  <CardTitle className="text-xl font-semibold text-white">Full Wallet Address</CardTitle>
                  <CardDescription className="text-gray-400">
                    Complete address for receiving funds from external sources
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-sm bg-gray-700 p-4 rounded-lg break-all text-gray-100">
                      {user.walletAddress}
                    </code>
                    <Button size="sm" variant="outline" onClick={copyAddress} className="border-gray-600 hover:bg-gray-700 hover:scale-105 transition-all duration-200">
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