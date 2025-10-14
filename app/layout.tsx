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
  // Configure rpId based on current environment
  const getRpId = () => {
    // For localhost development
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      return 'localhost'
    }

    // For production or custom domains
    const rpId = process.env.NEXT_PUBLIC_TURNKEY_RP_ID
    if (rpId) return rpId

    // Fallback to current hostname
    if (typeof window !== 'undefined') {
      return window.location.hostname
    }

    return 'localhost'
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
