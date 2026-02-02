import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import { injectedWallet, metaMaskWallet, coinbaseWallet } from '@rainbow-me/rainbowkit/wallets';
import { createConfig, http } from 'wagmi';
import { arbitrum, arbitrumSepolia } from 'wagmi/chains';
import { impersonator, getCustomArbitrumRpc } from '../connectors/impersonator';

// Define chains - Arbitrum only (Mainnet and Sepolia)
export const chains = [arbitrum, arbitrumSepolia] as const;

// Configure wallets with injected wallets + impersonator
const connectors = connectorsForWallets(
  [
    {
      groupName: 'Recommended',
      wallets: [injectedWallet, metaMaskWallet, coinbaseWallet],
    },
  ],
  {
    appName: 'Uniswap V2',
    projectId: 'fead6fdcf948f3113623ffbfa6e5f76a',
  }
);

// Add impersonator connector to the list
const allConnectors = [...connectors, impersonator()];

// Function to get transport for a chain (with custom RPC support for Arbitrum)
export const getTransport = (chainId: number) => {
  const customRpc = getCustomArbitrumRpc();
  
  // Use custom RPC only for Arbitrum chains (mainnet and sepolia)
  if (customRpc && (chainId === arbitrum.id || chainId === arbitrumSepolia.id)) {
    return http(customRpc);
  }
  
  return http();
};

// Create wagmi config with Arbitrum chains only
export const config = createConfig({
  chains,
  connectors: allConnectors,
  transports: {
    [arbitrum.id]: getTransport(arbitrum.id),
    [arbitrumSepolia.id]: getTransport(arbitrumSepolia.id),
  },
});

// Function to update config with new custom RPC
export const updateArbitrumRpc = (rpcUrl: string | undefined) => {
  // Update the transport for Arbitrum chains
  const newTransport = rpcUrl ? http(rpcUrl) : http();
  
  // Note: wagmi config transports are not directly mutable after creation
  // The getTransport function will be called on connection/reconnection
  console.log('Arbitrum RPC updated:', rpcUrl || 'default');
};

