import { NextRequest, NextResponse } from 'next/server'
import { sendStx } from '@/lib/blockchain/stacks'
import { SENDER_KEY } from '@/lib/config'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { address } = body

    console.log('[API] Received request body:', body)
    console.log('[API] Extracted address:', address)
    console.log('[API] Address length:', address?.length)
    console.log('[API] Address starts with ST:', address?.startsWith('ST'))

    if (!address) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      )
    }

    // Basic validation - just ensure it's a non-empty string starting with ST
    if (!address || typeof address !== 'string' || !address.startsWith('ST')) {
      console.log('[API] Address validation failed:', {
        address,
        type: typeof address,
        startsWithST: address?.startsWith('ST')
      })
      return NextResponse.json(
        { error: 'Invalid Stacks address format' },
        { status: 400 }
      )
    }

    console.log(`[API] Requesting faucet for address: ${address}`)

    // First, try to use the external faucet API
    console.log('[API] Attempting faucet API request...')
    let faucetTxId = null

    try {
      // Call the external Stacks faucet API with timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

      const faucetResponse = await fetch(
        `https://api.testnet.stacks.co/extended/v1/faucets/stx?address=${address}&stacking=false`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'SEP-DEX-Faucet-Proxy/1.0',
          },
          signal: controller.signal,
        }
      )

      clearTimeout(timeoutId)

      console.log(`[API] External API response status: ${faucetResponse.status}`)

      if (faucetResponse.ok) {
        let faucetData
        try {
          faucetData = await faucetResponse.json()
        } catch (parseError) {
          console.error('[API] Failed to parse faucet response as JSON:', parseError)
          throw new Error('Invalid response from faucet API')
        }

        console.log(`[API] Faucet response:`, faucetData)

        if (faucetData.txId || faucetData.success) {
          faucetTxId = faucetData.txId || 'faucet-success'
          console.log(`[API] Faucet API successful, txId: ${faucetTxId}`)

          return NextResponse.json({
            success: true,
            data: faucetData,
            message: 'Faucet request successful',
            method: 'faucet_api'
          })
        }
      } else {
        const errorText = await faucetResponse.text()
        console.error(`[API] Faucet API failed: ${faucetResponse.status} ${errorText}`)
      }
    } catch (fetchError) {
      console.error('[API] Faucet API request failed:', fetchError)
    }

    // If faucet API fails, try using admin private key to send STX directly
    console.log('[API] Faucet API failed, attempting admin transfer...')

    if (!SENDER_KEY) {
      console.error('[API] No admin private key available for fallback')
      return NextResponse.json(
        {
          error: 'Faucet unavailable and no admin key configured',
          details: 'Both faucet API and admin fallback failed'
        },
        { status: 503 } // Service Unavailable
      )
    }

    try {
      console.log(`[API] Sending 100 STX from admin to ${address}`)

      // Send 100 STX (100 * 1,000,000 microSTX)
      const transferTxId = await sendStx(100_000_000, address, SENDER_KEY)

      console.log(`[API] Admin transfer successful, txId: ${transferTxId}`)

      return NextResponse.json({
        success: true,
        data: {
          txId: transferTxId,
          amount: 100,
          method: 'admin_transfer'
        },
        message: 'Admin transfer successful (faucet fallback)',
        method: 'admin_transfer'
      })

    } catch (transferError) {
      console.error('[API] Admin transfer failed:', transferError)
      return NextResponse.json(
        {
          error: 'Both faucet and admin transfer failed',
          details: transferError instanceof Error ? transferError.message : 'Unknown transfer error'
        },
        { status: 503 }
      )
    }

  } catch (error) {
    console.error('[API] Faucet API error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
