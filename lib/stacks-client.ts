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
  getAddressFromPrivateKey,
  makeSTXTokenTransfer,
} from '@stacks/transactions';
import { STACKS_TESTNET } from '@stacks/network';
import { stxToMicroStx, printSuccess, printError } from './utils';
import { CONTRACT_ADDRESS, CONTRACT_NAME, SENDER_KEY, SENDER_ADDRESS, NETWORK } from './config';

// Contract call functions (only deposit and create-position for now)
export async function depositStx(amount: number, senderAddress: string, senderKey: string): Promise<string> {
  // Derive the address from the private key (the user provided this logic)
  const SENDER_ADDRESS = getAddressFromPrivateKey(senderKey, NETWORK);

  console.log(`\n🚀 Attempting contract deposit: ${amount / 1_000_000} STX from ${SENDER_ADDRESS} to ${CONTRACT_ADDRESS}.${CONTRACT_NAME}::deposit`);

  const txOptions = {
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: 'deposit',
    functionArgs: [uintCV(amount)], // amount is already in microSTX
    senderKey: senderKey,
    validateWithAbi: false, // Disable ABI validation to avoid issues
    network: NETWORK,
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Allow, // Changed from Deny to Allow for more flexibility
  };

  try {
    console.log(`[v0] Contract deposit txOptions:`, {
      contractAddress: txOptions.contractAddress,
      contractName: txOptions.contractName,
      functionName: txOptions.functionName,
      amount: amount,
      senderAddress: SENDER_ADDRESS
    });

    const transaction = await makeContractCall(txOptions);
    console.log(`[v0] Contract call created successfully`);

    const broadcastResponse = await broadcastTransaction({ transaction, network: NETWORK });
    console.log(`[v0] Contract deposit broadcast response:`, broadcastResponse);

    if ('error' in broadcastResponse) {
      console.error(`[v0] Contract deposit failed:`, broadcastResponse.error);
      throw new Error(`Contract deposit failed: ${broadcastResponse.error}`);
    }

    printSuccess(`✅ Contract deposit ${amount / 1_000_000} STX successful`, broadcastResponse.txid);
    return broadcastResponse.txid;
  } catch (error) {
    console.error(`[v0] Contract deposit error:`, error);
    printError('Contract Deposit', error);
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
      network: NETWORK,
      anchorMode: AnchorMode.Any,
      postConditionMode: PostConditionMode.Allow,
    };

    const transaction = await makeContractCall(txOptions);
    const broadcastResponse = await broadcastTransaction({
      transaction: transaction,
      network: NETWORK
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
  const amountInMicroSTX = Math.floor(amount * 1_000_000);

  console.log(`\n💰 Admin payout ${amount} STX to ${userAddress}...`);

  const txOptions = {
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: 'admin-payout',
    functionArgs: [principalCV(userAddress), uintCV(amountInMicroSTX)],
    senderKey: adminPrivateKey,
    validateWithAbi: true,
    network: NETWORK,
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Allow,
  };

  try {
    const transaction = await makeContractCall(txOptions);
    const broadcastResponse = await broadcastTransaction({ transaction, network: NETWORK });
    printSuccess(`Admin Payout ${amount} STX to ${userAddress}`, broadcastResponse.txid);
    return broadcastResponse.txid;
  } catch (error) {
    printError('Admin Payout', error);
    throw error;
  }
}

// Direct STX transfer function
export async function sendStx(amount: number, recipientAddress: string, senderKey: string): Promise<string> {
  try {
    console.log(`\n💸 Direct STX transfer: ${amount / 1_000_000} STX to ${recipientAddress}`);

    const senderAddress = getAddressFromPrivateKey(senderKey, NETWORK);

    const txOptions = {
      recipient: recipientAddress,
      amount: amount, // amount is in microSTX
      senderKey: senderKey,
      network: NETWORK,
      anchorMode: AnchorMode.Any,
      postConditionMode: PostConditionMode.Allow,
    };

    console.log(`[v0] Direct transfer txOptions:`, {
      recipient: txOptions.recipient,
      amount: amount,
      senderAddress: senderAddress
    });

    const transaction = await makeSTXTokenTransfer(txOptions);
    console.log(`[v0] Direct transfer transaction created`);

    const broadcastResponse = await broadcastTransaction({ transaction, network: NETWORK });
    console.log(`[v0] Direct transfer broadcast response:`, broadcastResponse);

    if ('error' in broadcastResponse) {
      console.error(`[v0] Direct transfer failed:`, broadcastResponse.error);
      throw new Error(`Direct transfer failed: ${broadcastResponse.error}`);
    }

    printSuccess(`✅ Direct STX transfer ${amount / 1_000_000} STX successful`, broadcastResponse.txid);
    return broadcastResponse.txid;
  } catch (error) {
    console.error(`[v0] Direct transfer error:`, error);
    printError('Direct STX Transfer', error);
    throw error;
  }
}