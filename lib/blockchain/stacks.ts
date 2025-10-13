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

// Get actual Stacks wallet balance (not contract balance)
export async function getStacksBalance(address: string): Promise<number> {
  try {
    const response = await fetch(`https://stacks-node-api.testnet.stacks.co/extended/v1/address/${address}/balances`)
    const data = await response.json()
    return data.stx.balance ? Number(data.stx.balance) : 0
  } catch (error) {
    console.error("[v0] Failed to get Stacks balance:", error)
    return 0
  }
}