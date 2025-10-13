"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth/context"
import { getStacksBalance } from "@/lib/blockchain/stacks"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function DebugPage() {
  const { user, isAuthenticated, isLoading, createLocalWallet } = useAuth()
  const router = useRouter()
  const [debugInfo, setDebugInfo] = useState<any>({})
  const [balance, setBalance] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [privateKey, setPrivateKey] = useState("")

  useEffect(() => {
    if (user) {
      setDebugInfo({
        userId: user.id,
        walletAddress: user.walletAddress,
        walletId: user.walletId,
        subOrgId: user.subOrgId,
        createdAt: user.createdAt,
        isAuthenticated: isAuthenticated,
        isLoading: isLoading
      })
    }
  }, [user, isAuthenticated, isLoading])

  const checkBalance = async () => {
    if (!user?.walletAddress) {
      setError("No wallet address available")
      return
    }

    setLoading(true)
    setError(null)
    try {
      console.log("Checking balance for address:", user.walletAddress)
      const balanceResult = await getStacksBalance(user.walletAddress)
      setBalance(balanceResult)
    } catch (err) {
      console.error("Failed to check balance:", err)
      setError(err instanceof Error ? err.message : "Failed to check balance")
    } finally {
      setLoading(false)
    }
  }

  const importWallet = async () => {
    if (!privateKey) {
      setError("Please enter a private key")
      return
    }

    setLoading(true)
    setError(null)
    try { 
      // This would be the function to import a wallet with a known private key
      // For now, we'll just show a message
      alert("In a full implementation, this would import your wallet with the provided private key. For now, please use the local wallet creation option and then manually add funds to that address.")
    } catch (err) {
      console.error("Failed to import wallet:", err)
      setError(err instanceof Error ? err.message : "Failed to import wallet")
    } finally {
      setLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Loading...</h1>
          <p className="text-muted-foreground">Checking authentication status</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-500">Not Authenticated</h1>
          <p className="text-muted-foreground">Please log in to view debug information</p>
          <Button onClick={() => router.push("/auth/login")} className="mt-4">
            Go to Login
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8 text-center">Debug Information</h1>
          
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>User Information</CardTitle>
              <CardDescription>Current authenticated user details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold">User ID:</h3>
                  <p className="break-all bg-muted p-2 rounded">{debugInfo.userId || 'N/A'}</p>
                </div>
                <div>
                  <h3 className="font-semibold">Wallet Address:</h3>
                  <p className="break-all bg-muted p-2 rounded">{debugInfo.walletAddress || 'N/A'}</p>
                </div>
                <div>
                  <h3 className="font-semibold">Wallet ID:</h3>
                  <p className="break-all bg-muted p-2 rounded">{debugInfo.walletId || 'N/A'}</p>
                </div>
                <div>
                  <h3 className="font-semibold">Sub Org ID:</h3>
                  <p className="break-all bg-muted p-2 rounded">{debugInfo.subOrgId || 'N/A'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Balance Check</CardTitle>
              <CardDescription>Test the balance fetching function</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <Button onClick={checkBalance} disabled={loading || !user?.walletAddress}>
                  {loading ? "Checking..." : "Check Balance"}
                </Button>
              </div>
              
              {error && (
                <div className="bg-destructive/10 border border-destructive/50 rounded p-4 mb-4">
                  <h3 className="font-semibold text-destructive">Error:</h3>
                  <p className="text-destructive">{error}</p>
                </div>
              )}
              
              {balance !== null && (
                <div className="bg-muted rounded p-4">
                  <h3 className="font-semibold mb-2">Balance Results:</h3>
                  <p>STX Balance: {balance.toFixed(2)} STX</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Import Wallet</CardTitle>
              <CardDescription>Import an existing wallet with a private key</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="private-key">Private Key</Label>
                  <Input
                    id="private-key"
                    type="password"
                    placeholder="Enter your private key"
                    value={privateKey}
                    onChange={(e) => setPrivateKey(e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground">
                    Enter your private key to import an existing wallet (for testing purposes only)
                  </p>
                </div>
                <Button onClick={importWallet} disabled={loading}>
                  {loading ? "Importing..." : "Import Wallet"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Debugging Steps</CardTitle>
              <CardDescription>Follow these steps to identify the issue</CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal list-inside space-y-2">
                <li>Check the wallet address above - is it the same one you're checking in the explorer?</li>
                <li>Click "Check Balance" to manually test the balance fetching function</li>
                <li>Open browser developer tools (F12) and check the console for any error messages</li>
                <li>If the balance shows 0, compare the wallet address with the one in the explorer</li>
                <li>If you're using a local wallet, make sure you've backed up your private key</li>
                <li className="font-semibold">Important: The current implementation uses mock Turnkey responses, so wallet addresses are randomly generated and won't have real funds</li>
              </ol>
              
              <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/50 rounded">
                <h3 className="font-semibold text-yellow-500">Solution:</h3>
                <p className="text-yellow-500">
                  To test with a wallet that has actual funds:
                </p>
                <ol className="list-decimal list-inside mt-2 space-y-1 text-yellow-500">
                  <li>Use the "Local Wallet" option when creating a wallet</li>
                  <li>Note the generated wallet address</li>
                  <li>Send test STX to that address using the Stacks testnet faucet</li>
                  <li>Refresh the wallet page to see the updated balance</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}