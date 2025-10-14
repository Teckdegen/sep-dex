import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Utility functions for STX operations
export function stxToMicroStx(amountInSTX: number): number {
  return Math.floor(amountInSTX * 1_000_000)
}

export function printSuccess(message: string, txId?: string) {
  console.log(`✅ ${message}${txId ? ` - TX: ${txId}` : ''}`)
}

export function printError(operation: string, error: any) {
  console.error(`❌ ${operation} failed:`, error.message || error)
}

// Convert USD profit to STX amount for payouts
export function convertUsdProfitToStx(usdProfit: number): number {
  // Get current STX price in USD
  const stxPriceUsd = getCurrentStxPrice()

  // Convert USD profit to STX amount
  const stxProfit = usdProfit / stxPriceUsd

  // Round to appropriate decimal places for STX (6 decimal places)
  return Math.round(stxProfit * 1_000_000) / 1_000_000
}

// Helper function to get current STX price (this would typically come from your price feed)
function getCurrentStxPrice(): number {
  // For now, return a fixed price - in production you'd fetch this from your price feed
  // You could also make this configurable or fetch it dynamically
  return 1.85 // Example: $1.85 per STX
}
