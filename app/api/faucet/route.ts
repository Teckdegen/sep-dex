import { NextRequest, NextResponse } from 'next/server'

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

    // Call the external Stacks faucet API
    const faucetResponse = await fetch(
      `https://api.testnet.stacks.co/extended/v1/faucets/stx?address=${address}&stacking=false`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'SEP-DEX-Faucet-Proxy/1.0',
        },
      }
    )

    if (!faucetResponse.ok) {
      const errorText = await faucetResponse.text()
      console.error(`[API] Faucet request failed: ${faucetResponse.status} ${errorText}`)

      return NextResponse.json(
        {
          error: 'Faucet request failed',
          details: `HTTP ${faucetResponse.status}: ${errorText}`
        },
        { status: faucetResponse.status }
      )
    }

    const faucetData = await faucetResponse.json()
    console.log(`[API] Faucet response:`, faucetData)

    return NextResponse.json({
      success: true,
      data: faucetData,
      message: 'Faucet request submitted successfully'
    })

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
