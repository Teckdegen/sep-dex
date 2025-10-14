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
export function convertUsdProfitToStx(usdProfit: number, stxPrice?: number): number {
  // Get current STX price in USD - use provided price or fallback to default
  const stxPriceUsd = stxPrice || getCurrentStxPrice()

  // Convert USD profit to STX amount
  const stxProfit = usdProfit / stxPriceUsd

  // Round to appropriate decimal places for STX (6 decimal places)
  return Math.round(stxProfit * 1_000_000) / 1_000_000
}

// Helper function to get current STX price (fetch from price feed)
function getCurrentStxPrice(): number {
  // In a real implementation, this would fetch from your price feed
  // For now, we'll use a more reasonable default and you should replace this
  // with actual price feed integration
  return 2.50 // Updated to a more realistic STX price
}
