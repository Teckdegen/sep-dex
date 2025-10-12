import {
  makeContractCall,
  broadcastTransaction,
  AnchorMode,
  PostConditionMode,
  stringAsciiCV,
  uintCV,
  principalCV,
  callReadOnlyFunction,
  cvToJSON,
} from '@stacks/transactions';
import { StacksNetwork, NetworkConfiguration } from '@stacks/network';

// Network configuration
const NETWORK: NetworkConfiguration = {
  name: 'mainnet', // or 'testnet'
  url: 'https://stacks-node-api.mainnet.stacks.co', // or testnet URL
};

// Contract details
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM'; // Replace with your deployed address
const CONTRACT_NAME = 'sep-dex';

// Helper to get network
const getNetwork = (): StacksNetwork => new StacksNetwork(NETWORK);

// Read-only functions (if available in your contract)
export async function getUserContractBalance(userAddress: string): Promise<number> {
  try {
    const result = await callReadOnlyFunction({
      contractAddress: CONTRACT_ADDRESS,
      contractName: CONTRACT_NAME,
      functionName: 'get-balance',
      functionArgs: [principalCV(userAddress)],
      senderAddress: userAddress,
      network: getNetwork(),
    });
    return parseInt(cvToJSON(result).value, 10) || 0;
  } catch (error) {
    console.error('Error fetching user balance:', error);
    throw error;
  }
}

// Contract call functions (only deposit and create-position for now)
export async function depositStx(amount: number, userAddress: string, privateKey: string): Promise<string> {
  try {
    const tx = await makeContractCall({
      contractAddress: CONTRACT_ADDRESS,
      contractName: CONTRACT_NAME,
      functionName: 'deposit-stx',
      functionArgs: [uintCV(amount * 1000000)], // Convert to microSTX
      senderKey: privateKey,
      anchorMode: AnchorMode.Any,
      postConditionMode: PostConditionMode.Allow,
      network: getNetwork(),
    });

    const txId = await broadcastTransaction(tx, getNetwork());
    return txId;
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
    const tx = await makeContractCall({
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
      anchorMode: AnchorMode.Any,
      postConditionMode: PostConditionMode.Allow,
      network: getNetwork(),
    });

    const txId = await broadcastTransaction(tx, getNetwork());
    return txId;
  } catch (error) {
    console.error('Error creating position:', error);
    throw error;
  }
}

export async function adminPayout(userAddress: string, amount: number, adminPrivateKey: string): Promise<string> {
  try {
    const tx = await makeContractCall({
      contractAddress: CONTRACT_ADDRESS,
      contractName: CONTRACT_NAME,
      functionName: 'admin-payout',
      functionArgs: [principalCV(userAddress), uintCV(amount * 1000000)],
      senderKey: adminPrivateKey,
      anchorMode: AnchorMode.Any,
      postConditionMode: PostConditionMode.Allow,
      network: getNetwork(),
    });

    const txId = await broadcastTransaction(tx, getNetwork());
    return txId;
  } catch (error) {
    console.error('Error processing payout:', error);
    throw error;
  }
}
