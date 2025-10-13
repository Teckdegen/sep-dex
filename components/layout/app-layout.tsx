'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  BarChart3, 
  Wallet, 
  TrendingUp, 
  LogOut, 
  Menu,
  Home,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { MobileNav } from '@/components/layout/mobile-nav'
import { useAuth } from '@/lib/auth/context'
import { getStacksBalance } from '@/lib/blockchain/stacks'
import { Loader2 } from 'lucide-react'

interface AppLayoutProps {
  children: React.ReactNode
  walletAddress: string
}

export function AppLayout({ children, walletAddress }: AppLayoutProps) {
  const pathname = usePathname()
  const { logout } = useAuth()
  const [walletBalance, setWalletBalance] = React.useState<number>(0)
  const [isLoadingBalance, setIsLoadingBalance] = React.useState(true)

  React.useEffect(() => {
    if (walletAddress) {
      loadWalletBalance()
      
      // Set up automatic balance refresh every 2 minutes (120000 ms)
      const balanceInterval = setInterval(loadWalletBalance, 120000)
      
      // Clean up interval on component unmount
      return () => clearInterval(balanceInterval)
    }
  }, [walletAddress])

  async function loadWalletBalance() {
    if (!walletAddress) return

    try {
      setIsLoadingBalance(true)
      const balance = await getStacksBalance(walletAddress)
      setWalletBalance(balance)
    } catch (error) {
      console.error("[v0] Failed to load wallet balance:", error)
    } finally {
      setIsLoadingBalance(false)
    }
  }

  const navItems = [
    {
      title: 'Dashboard',
      href: '/trade',
      icon: Home,
    },
    {
      title: 'Positions',
      href: '/positions',
      icon: BarChart3,
    },
    {
      title: 'Charts',
      href: '/charts',
      icon: TrendingUp,
    },
    {
      title: 'Wallet',
      href: '/wallet',
      icon: Wallet,
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/10">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto flex items-center justify-between p-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <MobileNav />
              <h1 className="text-xl font-bold text-foreground">SEP DEX</h1>
            </div>
            <nav className="hidden md:flex items-center gap-4">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-foreground/80 hover:text-foreground hover:bg-secondary'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.title}
                  </Link>
                )
              })}
            </nav>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-secondary/50 rounded-lg px-3 py-2">
              <Wallet className="h-4 w-4 text-muted-foreground" />
              <div className="text-sm">
                <div className="text-foreground font-medium">
                  {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                </div>
                <div className="text-muted-foreground">
                  {isLoadingBalance ? (
                    <Loader2 className="inline h-3 w-3 animate-spin" />
                  ) : (
                    `${(walletBalance / 1_000_000).toFixed(2)} STX`
                  )}
                </div>
              </div>
            </div>
            
            <Button 
              onClick={logout} 
              variant="outline" 
              size="sm"
              className="border-border hover:bg-secondary hidden md:flex"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto">
        {children}
      </main>
    </div>
  )
}