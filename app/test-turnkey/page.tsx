"use client"

import { useState } from 'react'
import { createUserSubOrg, createStacksWallet, loginWithPasskey } from '../../lib/turnkey/service'

export default function TurnkeyTestPage() {
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  const handleCreateWallet = async () => {
    try {
      setStatus('Creating sub-organization with passkey...')
      setError('')
      
      // This should trigger the passkey prompt
      const subOrgResponse = await createUserSubOrg('test-user')
      setStatus(`Sub-org created: ${subOrgResponse.subOrganizationId}`)
      
      // Create a Stacks wallet
      setStatus('Creating Stacks wallet...')
      const walletResponse = await createStacksWallet(
        subOrgResponse.subOrganizationId, 
        'test-stacks-wallet'
      )
      setStatus(`Wallet created: ${walletResponse.walletId} with address ${walletResponse.addresses[0]}`)
    } catch (err: any) {
      console.error('Error:', err)
      setError(`Error: ${err.message}`)
      setStatus('')
    }
  }

  const handleLogin = async () => {
    try {
      setStatus('Attempting passkey login...')
      setError('')
      
      // This should trigger the passkey prompt
      const loginResponse = await loginWithPasskey()
      setStatus(`Login successful: ${loginResponse.organizationId}`)
    } catch (err: any) {
      console.error('Error:', err)
      setError(`Error: ${err.message}`)
      setStatus('')
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Turnkey Passkey Test</h1>
      
      <div className="mb-4">
        <button 
          onClick={handleCreateWallet}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mr-2"
        >
          Create Wallet with Passkey
        </button>
        
        <button 
          onClick={handleLogin}
          className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
        >
          Login with Passkey
        </button>
      </div>
      
      {status && (
        <div className="mb-4 p-4 bg-blue-100 text-blue-800 rounded">
          {status}
        </div>
      )}
      
      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-800 rounded">
          {error}
        </div>
      )}
      
      <div className="mt-8 p-4 bg-yellow-100 text-yellow-800 rounded">
        <h2 className="font-bold mb-2">Instructions:</h2>
        <p>1. Click "Create Wallet with Passkey" to test passkey creation</p>
        <p>2. Click "Login with Passkey" to test passkey authentication</p>
        <p className="mt-2">If everything is configured correctly, you should see passkey prompts from your Windows system.</p>
        <p className="mt-2 font-bold">Make sure you're running this on localhost or HTTPS for WebAuthn to work!</p>
      </div>
    </div>
  )
}