import {
  makeContractCall,
  broadcastTransaction,
  AnchorMode,
  PostConditionMode,
  stringAsciiCV,
  uintCV,
  principalCV,
  getAddressFromPrivateKey,
} from '@stacks/transactions';
import { STACKS_TESTNET } from '@stacks/network';
import { stxToMicroStx, printSuccess, printError } from './utils';
import { CONTRACT_ADDRESS, CONTRACT_NAME, SENDER_KEY, SENDER_ADDRESS, NETWORK } from './config';

// Contract call functions (only deposit and create-position for now)
export async function depositStx(amount: number, senderAddress: string, senderKey: string): Promise<string> {
  // Derive the address from the private key (the user provided this logic)
  const SENDER_ADDRESS = getAddressFromPrivateKey(senderKey, NETWORK);

  console.log(`\n Depositing ${amount / 1_000_000} STX from address: ${SENDER_ADDRESS}...`);

  const txOptions = {
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: 'deposit',
    functionArgs: [uintCV(amount)], // amount is already in microSTX
    senderKey: senderKey,
    validateWithAbi: true,
    network: NETWORK,
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Deny,
  };

  try {
    const transaction = await makeContractCall(txOptions);
    const broadcastResponse = await broadcastTransaction({ transaction, network: NETWORK });
    printSuccess(`Deposit ${amount / 1_000_000} STX`, broadcastResponse.txid);
    return broadcastResponse.txid;
  } catch (error) {
    printError('Deposit', error);
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