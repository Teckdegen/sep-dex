import {
  makeContractCall,
  broadcastTransaction,
  AnchorMode,
  PostConditionMode,
  stringAsciiCV,
  uintCV,
  principalCV
} from '@stacks/transactions';
import { STACKS_TESTNET } from '@stacks/network';

// Contract details
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM'; // Replace with your deployed address
const CONTRACT_NAME = 'sep-dex';

// Helper to get network
function getNetwork() {
  return STACKS_TESTNET;
}

// Contract call functions (only deposit and create-position for now)
export async function depositStx(amount: number, senderAddress: string, senderKey: string): Promise<string> {
  try {
    const txOptions = {
      contractAddress: CONTRACT_ADDRESS,
      contractName: CONTRACT_NAME,
      functionName: 'deposit',
      functionArgs: [uintCV(amount)],
      senderKey: senderKey,
      network: getNetwork(),
      anchorMode: AnchorMode.Any,
      postConditionMode: PostConditionMode.Deny,
    };

    const transaction = await makeContractCall(txOptions);
    const broadcastResponse = await broadcastTransaction({
      transaction: transaction,
      network: getNetwork()
    });

    if ('error' in broadcastResponse) {
      throw new Error(`Transaction failed: ${broadcastResponse.error}`);
    }

    return broadcastResponse.txid;
  } catch (error) {
    console.error('Error depositing STX:', error);
    throw error;
  }
}

export async function createPosition(
  asset: string,
  side: string,
  leverage: number,
  collateral: number,
  privateKey: string,
  userAddress: string
): Promise<string> {
  try {
    const txOptions = {
      contractAddress: CONTRACT_ADDRESS,
      contractName: CONTRACT_NAME,
      functionName: 'create-position',
      functionArgs: [
        stringAsciiCV(asset),
        stringAsciiCV(side),
        uintCV(leverage),
        uintCV(collateral * 1000000), // Convert to microSTX
      ],
      senderKey: privateKey,
      network: getNetwork(),
      anchorMode: AnchorMode.Any,
      postConditionMode: PostConditionMode.Allow,
    };

    const transaction = await makeContractCall(txOptions);
    const broadcastResponse = await broadcastTransaction({
      transaction: transaction,
      network: getNetwork()
    });

    if ('error' in broadcastResponse) {
      throw new Error(`Transaction failed: ${broadcastResponse.error}`);
    }

    return broadcastResponse.txid;
  } catch (error) {
    console.error('Error creating position:', error);
    throw error;
  }
}

export async function adminPayout(userAddress: string, amount: number, adminPrivateKey: string): Promise<string> {
  try {
    const txOptions = {
      contractAddress: CONTRACT_ADDRESS,
      contractName: CONTRACT_NAME,
      functionName: 'admin-payout',
      functionArgs: [principalCV(userAddress), uintCV(amount * 1000000)],
      senderKey: adminPrivateKey,
      network: getNetwork(),
      anchorMode: AnchorMode.Any,
      postConditionMode: PostConditionMode.Allow,
    };

    const transaction = await makeContractCall(txOptions);
    const broadcastResponse = await broadcastTransaction({
      transaction: transaction,
      network: getNetwork()
    });

    if ('error' in broadcastResponse) {
      throw new Error(`Transaction failed: ${broadcastResponse.error}`);
    }

    return broadcastResponse.txid;
  } catch (error) {
    console.error('Error processing payout:', error);
    throw error;
  }
}