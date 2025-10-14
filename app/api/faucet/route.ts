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

    // Call the external Stacks faucet API with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

    try {
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
      console.log(`[API] External API response headers:`, Object.fromEntries(faucetResponse.headers.entries()))

      if (!faucetResponse.ok) {
        const errorText = await faucetResponse.text()
        console.error(`[API] Faucet request failed: ${faucetResponse.status} ${errorText}`)

        // Try to parse as JSON in case it's a JSON error response
        let errorDetails = errorText
        try {
          const errorJson = JSON.parse(errorText)
          errorDetails = JSON.stringify(errorJson, null, 2)
        } catch {
          // Keep original error text if not JSON
        }

        return NextResponse.json(
          {
            error: 'Faucet request failed',
            details: `External API returned ${faucetResponse.status}: ${errorDetails}`,
            externalStatus: faucetResponse.status
          },
          { status: 502 } // Bad Gateway - external service error
        )
      }

      let faucetData
      try {
        faucetData = await faucetResponse.json()
      } catch (parseError) {
        console.error('[API] Failed to parse faucet response as JSON:', parseError)
        const responseText = await faucetResponse.text()
        console.error('[API] Raw response:', responseText)

        return NextResponse.json(
          {
            error: 'Invalid response from faucet API',
            details: `Could not parse response: ${parseError instanceof Error ? parseError.message : 'Unknown parse error'}`,
            rawResponse: responseText.substring(0, 500) // First 500 chars
          },
          { status: 502 }
        )
      }

      console.log(`[API] Faucet response:`, faucetData)

      return NextResponse.json({
        success: true,
        data: faucetData,
        message: 'Faucet request submitted successfully'
      })

    } catch (fetchError) {
      clearTimeout(timeoutId)

      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.error('[API] Faucet request timed out')
        return NextResponse.json(
          {
            error: 'Faucet request timeout',
            details: 'The faucet API took too long to respond'
          },
          { status: 504 } // Gateway Timeout
        )
      }

      console.error('[API] Network error calling faucet API:', fetchError)
      return NextResponse.json(
        {
          error: 'Network error',
          details: fetchError instanceof Error ? fetchError.message : 'Unknown network error'
        },
        { status: 502 }
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
