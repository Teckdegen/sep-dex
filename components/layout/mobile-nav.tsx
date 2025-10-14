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
  FileText,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { useAuth, AuthContext } from '@/lib/auth/context'

export function MobileNav() {
  const pathname = usePathname()

  // Check if AuthProvider context is available before using useAuth
  const authContext = React.useContext(AuthContext)
  if (!authContext) {
    return (
      <Button variant="ghost" size="icon" className="md:hidden">
        <Menu className="h-6 w-6" />
        <span className="sr-only">Toggle navigation menu</span>
      </Button>
    )
  }

  const { logout } = authContext
  const [open, setOpen] = React.useState(false)

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

  const handleLogout = () => {
    setOpen(false)
    logout()
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-6 w-6" />
          <span className="sr-only">Toggle navigation menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <SheetHeader className="border-b p-4">
          <SheetTitle>SEP DEX</SheetTitle>
          <SheetDescription>
            Trading Platform
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col h-full">
          <nav className="flex-1 overflow-y-auto py-4">
            <ul className="space-y-1 px-2">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {item.title}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>
          <div className="border-t p-4">
            <Button
              variant="outline"
              className="w-full justify-start gap-3"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}