import { ethers } from 'ethers';
import { config } from '../config/env';

// Simple contract ABI for storing hashes
// For demo, we'll use a simple event-based approach or a minimal contract
const AUDIT_CONTRACT_ABI = [
  'event HashStored(bytes32 indexed hash, string entityType, string entityId, uint256 timestamp)',
  'function storeHash(bytes32 hash, string memory entityType, string memory entityId) public returns (bool)'
];

let provider: ethers.JsonRpcProvider | null = null;
let wallet: ethers.Wallet | null = null;
let contract: ethers.Contract | null = null;

// Initialize blockchain connection
export const initBlockchain = async (): Promise<void> => {
  try {
    if (!config.POLYGON_RPC_URL || config.POLYGON_RPC_URL.includes('your-api-key')) {
      console.warn('Blockchain: Polygon RPC URL not configured, using mock mode');
      return;
    }

    provider = new ethers.JsonRpcProvider(config.POLYGON_RPC_URL);
    
    if (config.PRIVATE_KEY && config.PRIVATE_KEY !== '') {
      wallet = new ethers.Wallet(config.PRIVATE_KEY, provider);
      console.log('Blockchain: Wallet connected:', wallet.address);
    } else {
      console.warn('Blockchain: Private key not configured, using read-only mode');
    }

    if (config.CONTRACT_ADDRESS && config.CONTRACT_ADDRESS !== '') {
      contract = new ethers.Contract(
        config.CONTRACT_ADDRESS,
        AUDIT_CONTRACT_ABI,
        wallet || provider
      );
      console.log('Blockchain: Contract connected:', config.CONTRACT_ADDRESS);
    } else {
      console.warn('Blockchain: Contract address not configured, using mock mode');
    }
  } catch (error) {
    console.error('Blockchain: Initialization error:', error);
    console.warn('Blockchain: Falling back to mock mode');
  }
};

// Store hash on blockchain
export const storeHashOnChain = async (
  hash: string,
  entityType: 'message' | 'file',
  entityId: string
): Promise<{ txHash?: string; blockNumber?: number; status: string }> => {
  try {
    // If blockchain not configured, return mock response
    if (!provider || !wallet || !contract) {
      console.log('Blockchain: Mock mode - Hash would be stored:', { hash, entityType, entityId });
      return {
        status: 'pending',
        txHash: '0x' + '0'.repeat(64), // Mock transaction hash
        blockNumber: 0
      };
    }

    // Convert hash to bytes32 (SHA-256 hash is 64 hex chars = 32 bytes)
    const hashHex = hash.startsWith('0x') ? hash : '0x' + hash;
    // Ensure it's exactly 66 chars (0x + 64 hex chars)
    const paddedHash = hashHex.length === 66 ? hashHex : hashHex.padEnd(66, '0').slice(0, 66);
    const hashBytes32 = ethers.zeroPadValue(paddedHash, 32);

    // Estimate gas
    const gasEstimate = await contract.storeHash.estimateGas(
      hashBytes32,
      entityType,
      entityId
    );

    // Send transaction
    const tx = await contract.storeHash(hashBytes32, entityType, entityId, {
      gasLimit: gasEstimate * BigInt(2) // Add buffer for gas
    });

    console.log('Blockchain: Transaction sent:', tx.hash);

    // Wait for confirmation
    const receipt = await tx.wait();
    console.log('Blockchain: Transaction confirmed in block:', receipt.blockNumber);

    return {
      status: 'confirmed',
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber
    };
  } catch (error: any) {
    console.error('Blockchain: Error storing hash:', error);
    
    // If it's a gas estimation error or network error, return pending status
    if (error.code === 'UNPREDICTABLE_GAS_LIMIT' || error.code === 'NETWORK_ERROR') {
      return {
        status: 'pending',
        txHash: undefined,
        blockNumber: undefined
      };
    }

    return {
      status: 'failed',
      txHash: undefined,
      blockNumber: undefined
    };
  }
};

// Verify hash on blockchain
export const verifyHashOnChain = async (
  hash: string
): Promise<{ verified: boolean; txHash?: string; blockNumber?: number }> => {
  try {
    // If blockchain not configured, return mock response
    if (!provider || !contract) {
      console.log('Blockchain: Mock mode - Hash would be verified:', hash);
      return {
        verified: true,
        txHash: '0x' + '0'.repeat(64),
        blockNumber: 0
      };
    }

    // Convert hash to bytes32 (SHA-256 hash is 64 hex chars = 32 bytes)
    const hashHex = hash.startsWith('0x') ? hash : '0x' + hash;
    // Ensure it's exactly 66 chars (0x + 64 hex chars)
    const paddedHash = hashHex.length === 66 ? hashHex : hashHex.padEnd(66, '0').slice(0, 66);
    const hashBytes32 = ethers.zeroPadValue(paddedHash, 32);

    // Query events for this hash
    const filter = contract.filters.HashStored(hashBytes32);
    const events = await contract.queryFilter(filter);

    if (events.length > 0) {
      const event = events[0];
      return {
        verified: true,
        txHash: event.transactionHash,
        blockNumber: event.blockNumber
      };
    }

    return {
      verified: false
    };
  } catch (error) {
    console.error('Blockchain: Error verifying hash:', error);
    return {
      verified: false
    };
  }
};

// Get blockchain status
export const getBlockchainStatus = async (): Promise<{ connected: boolean; network?: string; address?: string }> => {
  try {
    if (!provider) {
      return { connected: false };
    }

    const network = await provider.getNetwork();
    return {
      connected: true,
      network: network.name,
      address: wallet?.address
    };
  } catch (error) {
    console.error('Blockchain: Error getting status:', error);
    return { connected: false };
  }
};

