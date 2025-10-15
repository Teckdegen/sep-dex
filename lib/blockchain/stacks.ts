import {
  makeContractCall,
  broadcastTransaction,
  AnchorMode,
  PostConditionMode,
  uintCV,
  standardPrincipalCV,
  fetchCallReadOnlyFunction,
  cvToJSON,
} from "@stacks/transactions"
import { STACKS_TESTNET } from "@stacks/network"

export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
export const CONTRACT_NAME = "sep-dex"

function getNetwork() {
  return STACKS_TESTNET
}

export async function depositStx(amount: number, senderAddress: string, senderKey: string): Promise<string> {
  console.log("[v0] Depositing STX:", { amount, senderAddress })

  const txOptions = {
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: "deposit",
    functionArgs: [uintCV(amount)],
    senderKey,
    network: getNetwork(),
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Deny,
    // Removed postConditions as makeStandardSTXPostCondition is not available
  }

  const transaction = await makeContractCall(txOptions)
  const broadcastResponse = await broadcastTransaction({
    transaction: transaction,
    network: getNetwork()
  })

  if ('error' in broadcastResponse) {
    console.error("[v0] Deposit failed:", broadcastResponse)
    throw new Error(`Deposit failed: ${broadcastResponse.error}`)
  }

  console.log("[v0] Deposit successful:", broadcastResponse.txid)
  return broadcastResponse.txid
}

export async function withdrawStx(amount: number, senderKey: string): Promise<string> {
  console.log("[v0] Withdrawing STX:", amount)

  const txOptions = {
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: "withdraw",
    functionArgs: [uintCV(amount)],
    senderKey,
    network: getNetwork(),
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Allow,
  }

  const transaction = await makeContractCall(txOptions)
  const broadcastResponse = await broadcastTransaction({
    transaction: transaction,
    network: getNetwork()
  })

  if ('error' in broadcastResponse) {
    console.error("[v0] Withdrawal failed:", broadcastResponse)
    throw new Error(`Withdrawal failed: ${broadcastResponse.error}`)
  }

  console.log("[v0] Withdrawal successful:", broadcastResponse.txid)
  return broadcastResponse.txid
}

export async function getUserBalance(userAddress: string): Promise<number> {
  try {
    // Validate the address format
    const { validateStacksAddress } = await import('@stacks/transactions')
    if (!validateStacksAddress(userAddress)) {
      throw new Error(`Invalid Stacks address: ${userAddress}`)
    }

    const result = await fetchCallReadOnlyFunction({
      contractAddress: CONTRACT_ADDRESS,
      contractName: CONTRACT_NAME,
      functionName: "get-balance",
      functionArgs: [standardPrincipalCV(userAddress)],
      network: getNetwork(),
      senderAddress: userAddress,
    })

    const json = cvToJSON(result)
    return json.value ? Number(json.value) : 0
  } catch (error) {
    console.error("[v0] Failed to get balance:", error)
    return 0
  }
}

export async function getTotalDeposited(): Promise<number> {
  try {
    const result = await fetchCallReadOnlyFunction({
      contractAddress: CONTRACT_ADDRESS,
      contractName: CONTRACT_NAME,
      functionName: "get-total-deposited",
      functionArgs: [],
      network: getNetwork(),
      senderAddress: CONTRACT_ADDRESS,
    })

    const json = cvToJSON(result)
    return json.value ? Number(json.value) : 0
  } catch (error) {
    console.error("[v0] Failed to get total deposited:", error)
    return 0
  }
}

export async function getContractBalance(): Promise<number> {
  try {
    const result = await fetchCallReadOnlyFunction({
      contractAddress: CONTRACT_ADDRESS,
      contractName: CONTRACT_NAME,
      functionName: "get-contract-balance",
      functionArgs: [],
      network: getNetwork(),
      senderAddress: CONTRACT_ADDRESS,
    })

    const json = cvToJSON(result)
    return json.value ? Number(json.value) : 0
  } catch (error) {
    console.error("[v0] Failed to get contract balance:", error)
    return 0
  }
}

// Admin functions (for platform operator)
export async function adminPayout(userAddress: string, amount: number, adminKey: string): Promise<string> {
  console.log("[v0] Processing admin payout:", { userAddress, amount })

  const txOptions = {
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: "admin-payout",
    functionArgs: [standardPrincipalCV(userAddress), uintCV(amount)],
    senderKey: adminKey,
    network: getNetwork(),
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Allow,
  }

  const transaction = await makeContractCall(txOptions)
  const broadcastResponse = await broadcastTransaction({
    transaction: transaction,
    network: getNetwork()
  })

  if ('error' in broadcastResponse) {
    console.error("[v0] Payout failed:", broadcastResponse)
    throw new Error(`Payout failed: ${broadcastResponse.error}`)
  }

  console.log("[v0] Payout successful:", broadcastResponse.txid)
  return broadcastResponse.txid
}

export async function adminWithdraw(amount: number, adminKey: string): Promise<string> {
  console.log("[v0] Admin withdrawing:", amount)

  const txOptions = {
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: "admin-withdraw",
    functionArgs: [uintCV(amount)],
    senderKey: adminKey,
    network: getNetwork(),
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Allow,
  }

  const transaction = await makeContractCall(txOptions)
  const broadcastResponse = await broadcastTransaction({
    transaction: transaction,
    network: getNetwork()
  })

  if ('error' in broadcastResponse) {
    console.error("[v0] Admin withdrawal failed:", broadcastResponse)
    throw new Error(`Admin withdrawal failed: ${broadcastResponse.error}`)
  }

  console.log("[v0] Admin withdrawal successful:", broadcastResponse.txid)
  return broadcastResponse.txid
}

export async function adminFund(amount: number, adminKey: string): Promise<string> {
  console.log("[v0] Admin funding contract:", amount)

  const txOptions = {
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: "admin-fund",
    functionArgs: [uintCV(amount)],
    senderKey: adminKey,
    network: getNetwork(),
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Allow,
  }

  const transaction = await makeContractCall(txOptions)
  const broadcastResponse = await broadcastTransaction({
    transaction: transaction,
    network: getNetwork()
  })

  if ('error' in broadcastResponse) {
    console.error("[v0] Admin funding failed:", broadcastResponse)
    throw new Error(`Admin funding failed: ${broadcastResponse.error}`)
  }

  console.log("[v0] Admin funding successful:", broadcastResponse.txid)
  return broadcastResponse.txid
}

// Send STX directly from one wallet to another
export async function sendStx(amount: number, recipient: string, senderKey: string): Promise<string> {
  try {
    const { makeSTXTokenTransfer, broadcastTransaction, AnchorMode } = await import('@stacks/transactions')
    
    const txOptions = {
      recipient,
      amount,
      senderKey,
      network: getNetwork(),
      anchorMode: AnchorMode.Any,
    }

    const transaction = await makeSTXTokenTransfer(txOptions)
    const broadcastResponse = await broadcastTransaction({
      transaction: transaction,
      network: getNetwork()
    })

    if ('error' in broadcastResponse) {
      throw new Error(`Transaction failed: ${broadcastResponse.error}`)
    }

    return broadcastResponse.txid
  } catch (error) {
    console.error("[v0] Failed to send STX:", error)
    throw error
  }
}

// Limit Order functions (assuming contract has limit order support)
export async function placeLimitOrder(
  asset: string,
  direction: 'buy' | 'sell',
  size: number,
  leverage: number,
  limitPrice: number,
  collateral: number,
  senderKey: string
): Promise<string> {
  console.log("[v0] Placing limit order:", { asset, direction, size, leverage, limitPrice, collateral })

  const txOptions = {
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: "place-limit-order",
    functionArgs: [
      standardPrincipalCV(asset), // Assuming asset is an address, but should be string
      // Note: Clarity expects specific types, this is pseudocode
      // In real implementation, convert to Clarity types
    ],
    senderKey,
    network: getNetwork(),
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Allow,
  }

  // This is a placeholder - implement based on actual contract
  const transaction = await makeContractCall(txOptions)
  const broadcastResponse = await broadcastTransaction({
    transaction: transaction,
    network: getNetwork()
  })

  if ('error' in broadcastResponse) {
    throw new Error(`Limit order placement failed: ${broadcastResponse.error}`)
  }

  console.log("[v0] Limit order placed successfully:", broadcastResponse.txid)
  return broadcastResponse.txid
}

export async function cancelLimitOrder(orderId: number, senderKey: string): Promise<string> {
  console.log("[v0] Cancelling limit order:", orderId)

  const txOptions = {
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: "cancel-limit-order",
    functionArgs: [uintCV(orderId)],
    senderKey,
    network: getNetwork(),
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Allow,
  }

  const transaction = await makeContractCall(txOptions)
  const broadcastResponse = await broadcastTransaction({
    transaction: transaction,
    network: getNetwork()
  })

  if ('error' in broadcastResponse) {
    throw new Error(`Limit order cancellation failed: ${broadcastResponse.error}`)
  }

  console.log("[v0] Limit order cancelled successfully:", broadcastResponse.txid)
  return broadcastResponse.txid
}

// Check and execute limit orders (keeper function)
export async function checkAndExecuteLimitOrders(asset: string, currentPrice: number, adminKey: string): Promise<string> {
  console.log("[v0] Checking limit orders for asset:", asset, "at price:", currentPrice)

  const txOptions = {
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: "check-and-execute-orders",
    functionArgs: [standardPrincipalCV(asset)], 
    senderKey: adminKey,
    network: getNetwork(),
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Allow,
  }

  const transaction = await makeContractCall(txOptions)
  const broadcastResponse = await broadcastTransaction({
    transaction: transaction,
    network: getNetwork()
  })

  if ('error' in broadcastResponse) {
    throw new Error(`Limit order check failed: ${broadcastResponse.error}`)
  }

  console.log("[v0] Limit orders checked successfully:", broadcastResponse.txid)
  return broadcastResponse.txid
}

// Get transaction status
export async function getTransactionStatus(txId: string): Promise<string> {
  try {
    const response = await fetch(`https://stacks-node-api.testnet.stacks.co/extended/v1/tx/${txId}`)
    const data = await response.json()
    return data.tx_status
  } catch (error) {
    console.error("[v0] Failed to get transaction status:", error)
    return "pending"
  }
}

// Get actual Stacks wallet balance (not contract balance)
export async function getStacksBalance(address: string): Promise<number> {
  try {
    console.log("[v0] Fetching Stacks balance for address via API route:", address)
    
    // Validate address
    if (!address || address.length < 20) {
      console.error("[v0] Invalid address provided:", address)
      return 0
    }
    
    // Call our API route which will proxy the request to Stacks testnet API
    const timestamp = new Date().getTime();
    const url = `/api/stacks-balance?address=${address}&_=${timestamp}`
    
    console.log("[v0] Fetching from API route:", url)
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    })
    
    console.log("[v0] Response status:", response.status, response.statusText)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch balance: ${response.status} ${response.statusText}`)
    }
    
    const data = await response.json()
    console.log("[v0] Balance response for address", address, ":", JSON.stringify(data, null, 2))
    
    // Return the balance in STX (already converted in the API route)
    const balance = data.balance || 0
    console.log("[v0] Balance (STX):", balance)
    return balance
  } catch (error) {
    console.error("[v0] Failed to get Stacks balance via API route:", error)
    return 0
  }
}
