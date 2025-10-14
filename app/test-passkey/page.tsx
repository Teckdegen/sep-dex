"use client"

import { useState } from 'react'
import { createUserSubOrg, loginWithPasskey } from '../../lib/turnkey/service'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

export default function PasskeyTestPage() {
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  const handleCreateSubOrg = async () => {
    try {
      setIsProcessing(true)
      setStatus('Creating sub-organization with passkey...')
      setError('')
      
      // This should trigger the passkey prompt
      const response = await createUserSubOrg('test-user')
      setStatus(`Sub-org created successfully: ${response.subOrganizationId}`)
    } catch (err: any) {
      console.error('Error:', err)
      setError(`Error: ${err.message}`)
      setStatus('')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleLogin = async () => {
    try {
      setIsProcessing(true)
      setStatus('Attempting passkey login...')
      setError('')
      
      // This should trigger the passkey prompt
      const response = await loginWithPasskey()
      setStatus(`Login successful: ${response.organizationId}`)
    } catch (err: any) {
      console.error('Error:', err)
      setError(`Error: ${err.message}`)
      setStatus('')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-border bg-card p-8">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-2xl font-bold text-foreground">Passkey Test</h1>
          <p className="text-sm text-muted-foreground">Test Turnkey passkey functionality</p>
        </div>

        <div className="space-y-4">
          <Button 
            onClick={handleCreateSubOrg} 
            disabled={isProcessing} 
            className="w-full" 
            size="lg"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Sub-Org...
              </>
            ) : (
              "Create Sub-Org with Passkey"
            )}
          </Button>

          <Button
            onClick={handleLogin}
            disabled={isProcessing}
            variant="outline"
            className="w-full"
            size="lg"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Logging in...
              </>
            ) : (
              "Login with Passkey"
            )}
          </Button>

          {status && (
            <div className="rounded-lg bg-blue-500/10 p-3 text-sm text-blue-500 border border-blue-500/30">
              {status}
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-500 border border-red-500/30">
              {error}
            </div>
          )}

          <div className="rounded-lg border border-border bg-muted/50 p-4 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">Instructions:</p>
            <p className="mt-1">
              1. Click "Create Sub-Org with Passkey" to test passkey creation
            </p>
            <p className="mt-1">
              2. Click "Login with Passkey" to test passkey authentication
            </p>
            <p className="mt-1">
              If everything is configured correctly, you should see passkey prompts from your system.
            </p>
            <p className="mt-1 font-bold">
              Make sure you're running this on localhost or HTTPS for WebAuthn to work!
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}