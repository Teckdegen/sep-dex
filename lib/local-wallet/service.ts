// Utility functions for local wallet operations
import { makeSTXTokenTransfer, broadcastTransaction } from '@stacks/transactions';
import { STACKS_TESTNET } from '@stacks/network';

export function getLocalWalletPrivateKey(): string | null {
  return localStorage.getItem('local-wallet-private-key');
}

export function getLocalWalletAddress(): string | null {
  return localStorage.getItem('local-wallet-address');
}

export async function signAndBroadcastSTXTransfer(recipient: string, amount: number, memo?: string) {
  const senderKey = getLocalWalletPrivateKey();
  const senderAddress = getLocalWalletAddress();
  
  if (!senderKey || !senderAddress) {
    throw new Error('Local wallet not found');
  }

  try {
    const transaction = await makeSTXTokenTransfer({
      recipient,
      amount,
      senderKey,
      network: STACKS_TESTNET,
      memo: memo || 'SEP DEX Transfer',
    });

    const broadcastResponse = await broadcastTransaction({
      transaction: transaction,
      network: STACKS_TESTNET
    });

    return broadcastResponse;
  } catch (error) {
    console.error('[v0] STX transfer failed:', error);
    throw error;
  }
}