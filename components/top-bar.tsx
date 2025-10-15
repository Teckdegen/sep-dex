"use client"

import { useAuth } from '@/lib/auth/context'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Bell, User, LogOut, RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function TopBar() {
  const { user, logout, getUserWalletBalance } = useAuth()
  const router = useRouter()
  const [balance, setBalance] = useState(0)
  const [isLoadingBalance, setIsLoadingBalance] = useState(false)

  const handleRefreshBalance = async () => {
    if (!user?.walletAddress) return
    setIsLoadingBalance(true)
    try {
      const bal = await getUserWalletBalance()
      setBalance(bal)
    } catch (error) {
      console.error('Failed to refresh balance:', error)
    } finally {
      setIsLoadingBalance(false)
    }
  }

  return (
    <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-700 bg-gray-800 px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        <div className="flex items-center gap-x-4 lg:gap-x-6">
          {/* Balance Display */}
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-green-400 border-green-400">
              Balance: {balance.toFixed(2)} STX
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefreshBalance}
              disabled={isLoadingBalance}
            >
              <RefreshCw className={`h-4 w-4 ${isLoadingBalance ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-x-4 lg:gap-x-6">
        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon">
          <User className="h-5 w-5" />
        </Button>
        <Button variant="ghost" onClick={logout} className="text-red-400 hover:text-red-300">
          <LogOut className="h-5 w-5 mr-2" />
          Logout
        </Button>
      </div>
    </div>
  )
}
