import { NextResponse } from 'next/server'
import { STACKS_TESTNET } from '@stacks/network'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const address = searchParams.get('address')

  if (!address) {
    return NextResponse.json({ error: 'Address is required' }, { status: 400 })
  }

  try {
    // Use Stacks testnet API for balance checking
    const url = `${STACKS_TESTNET.client.baseUrl}/v2/accounts/${address}?proof=0&tip=latest`
    
    console.log('[v0] Fetching from Stacks testnet API URL:', url)
    
    // Fetch balance from the Stacks API
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    })
    
    console.log('[v0] Response status:', response.status, response.statusText)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch balance: ${response.status} ${response.statusText}`)
    }
    
    const data = await response.json()
    console.log('[v0] Balance response for address', address, ':', JSON.stringify(data, null, 2))
    
    // The balance is returned as a string in microSTX, convert to number
    // Handle both balance and stx.balance formats
    let balance = 0
    if (data.balance) {
      balance = Number(data.balance)
    } else if (data.stx && data.stx.balance) {
      balance = Number(data.stx.balance)
    } else if (data.stx && data.stx.balance && data.stx.balance.amount) {
      // Additional format handling
      balance = Number(data.stx.balance.amount)
    }
    
    console.log('[v0] Raw balance (microSTX):', balance)
    console.log('[v0] Converted balance (STX):', balance / 1_000_000)
    
    // Return balance in STX, not microSTX
    return NextResponse.json({ balance: balance / 1_000_000 })
  } catch (error) {
    console.error('[v0] Failed to get Stacks balance using Stacks testnet API:', error)
    return NextResponse.json({ error: 'Failed to fetch balance' }, { status: 500 })
  }
}