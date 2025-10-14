import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/lib/auth/context"
import { TurnkeyProvider } from "@turnkey/sdk-react"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })

export const metadata: Metadata = {
  title: "SEP DEX - Perpetual Futures Trading",
  description: "Trade BTC, ETH, STX, and SOL with up to 100x leverage",
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Configure rpId based on current environment and domain
  const getRpId = () => {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      return process.env.NEXT_PUBLIC_TURNKEY_RP_ID || 'localhost'
    }

    const currentHostname = window.location.hostname

    // For localhost development
    if (currentHostname === 'localhost' || currentHostname === '127.0.0.1') {
      return 'localhost'
    }

    // For Vercel deployments - use the actual domain
    if (currentHostname.endsWith('.vercel.app')) {
      return currentHostname
    }

    // For custom domains or production
    const envRpId = process.env.NEXT_PUBLIC_TURNKEY_RP_ID
    if (envRpId && envRpId !== 'localhost') {
      return envRpId
    }

    // Fallback to current hostname
    return currentHostname
  }

  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased">
        <TurnkeyProvider
          config={{
            apiBaseUrl: "https://api.turnkey.com",
            defaultOrganizationId: process.env.NEXT_PUBLIC_TURNKEY_ORGANIZATION_ID,
            rpId: getRpId(),
          }}
        >
          <AuthProvider>{children}</AuthProvider>
        </TurnkeyProvider>
      </body>
    </html>
  )
}
