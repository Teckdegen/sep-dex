// ============================================================================
// config.ts - Configuration for Stacks operations
// ============================================================================

import { STACKS_TESTNET } from '@stacks/network';
import { getAddressFromPrivateKey } from '@stacks/transactions';

// Contract details
export const CONTRACT_ADDRESS = 'ST2KNHVS1NANRHD55HAG9X42KSMQ9GMS6KD6TC3TV';
export const CONTRACT_NAME = 'sep-dex';

// Admin private key for payouts and funding - read from environment variable only
export const SENDER_KEY = process.env.NEXT_PUBLIC_ADMIN_PRIVATE_KEY;

// Derive admin address from private key
export const SENDER_ADDRESS = SENDER_KEY ? getAddressFromPrivateKey(SENDER_KEY, STACKS_TESTNET.version) : '';

// Network configuration
export const NETWORK = STACKS_TESTNET;
