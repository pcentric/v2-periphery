import React, { createContext, useContext, useEffect, useState } from 'react';
import { ethers } from 'ethers';
import {
  useAccount,
  useConnect,
  useDisconnect,
  useWalletClient,
  usePublicClient,
  WagmiProvider,
} from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider, darkTheme, connectorsForWallets } from '@rainbow-me/rainbowkit';
import {
  injectedWallet,
  metaMaskWallet,
  coinbaseWallet,
  walletConnectWallet,
  rabbyWallet,
  trustWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { createConfig, http } from 'wagmi';
import { arbitrum, arbitrumSepolia } from 'wagmi/chains';

import '@rainbow-me/rainbowkit/styles.css';

// Types
interface Web3ReactContextValue {
  chainId: number | undefined;
  account: string | undefined;
  library: ethers.providers.Web3Provider | ethers.providers.JsonRpcProvider | undefined;
  active: boolean;
  error: any;
  isCheckedWallet: boolean;
  activate: any;
  deactivate: () => Promise<void>;
}

// Create context
const Web3ReactContext = createContext<Web3ReactContextValue | null>(null);

// WalletConnect Project ID
const projectId = '2cc94868db6b1ebd44d24dcea9ed7600';

// Supported chains (Arbitrum only)
const chains = [arbitrum, arbitrumSepolia] as const;

// Configure wallet connectors
const connectors = connectorsForWallets(
  [
    {
      groupName: 'Recommended',
      wallets: [
        metaMaskWallet,
        rabbyWallet,
        coinbaseWallet,
        walletConnectWallet,
        trustWallet,
        injectedWallet,
      ],
    },
  ],
  {
    appName: 'Uniswap V2',
    projectId,
  }
);

// Create Wagmi config
export const wagmiConfig = createConfig({
  chains,
  connectors,
  transports: {
    [arbitrum.id]: http('https://arb1.arbitrum.io/rpc'),
    [arbitrumSepolia.id]: http('https://sepolia-rollup.arbitrum.io/rpc'),
  },
  multiInjectedProviderDiscovery: false,
});

// Query client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Custom dark theme matching Uniswap colors
const customTheme = darkTheme({
  accentColor: '#FF007A',
  accentColorForeground: 'white',
  borderRadius: 'medium',
  fontStack: 'system',
  overlayBlur: 'small',
});

/**
 * RainbowKit Context Wrapper
 * Wraps the entire app with Wagmi, QueryClient, and RainbowKit providers
 */
export const RainbowKitContextWrapper: React.FC<{ children: React.ReactNode }> = ({ 
  children 
}) => {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={customTheme}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};

/**
 * Web3React Context Wrapper
 * Provides web3-react-like interface for backward compatibility
 */
export const Web3ReactContextWrapper: React.FC<{ children: React.ReactNode }> = ({ 
  children 
}) => {
  const [isCheckedWallet, setIsCheckedWallet] = useState(false);
  const [connectError, setConnectError] = useState<any>(null);
  
  const { connect } = useConnect();
  const { disconnectAsync } = useDisconnect();
  const { connector: activeConnector, status, address, chain } = useAccount();

  const [connectInfo, setConnectInfo] = useState<{
    chainId: number | undefined;
    account: string | undefined;
    provider: ethers.providers.Web3Provider | ethers.providers.JsonRpcProvider | undefined;
  }>({
    chainId: undefined,
    account: undefined,
    provider: undefined,
  });

  // Load connector and setup providers
  useEffect(() => {
    async function loadConnector() {
      if (activeConnector) {
        // Check if chain is supported
        if (!chain) {
          console.warn('Unsupported chain');
          setConnectError('unsupported');
          setConnectInfo({
            account: undefined,
            chainId: undefined,
            provider: undefined,
          });
          return;
        }

        try {
          const _chainId = await activeConnector.getChainId();
          const _account = address;
          const _provider = await activeConnector.getProvider();

          // Create ethers provider from wagmi provider (ethers v5)
          let ethersProvider: ethers.providers.Web3Provider | ethers.providers.JsonRpcProvider;

          if (_provider && window.ethereum) {
            // Use Web3Provider for wallet connections (ethers v5)
            ethersProvider = new ethers.providers.Web3Provider(_provider as any);
          } else {
            // Fallback to JsonRpcProvider (ethers v5)
            const rpcUrl = chain.id === arbitrum.id 
              ? 'https://arb1.arbitrum.io/rpc'
              : 'https://sepolia-rollup.arbitrum.io/rpc';
            ethersProvider = new ethers.providers.JsonRpcProvider(rpcUrl, {
              chainId: chain.id,
              name: chain.name,
            });
          }

          setConnectInfo({
            account: _account,
            chainId: _chainId,
            provider: ethersProvider,
          });

          setConnectError(null);
        } catch (error) {
          console.error('Failed to load connector:', error);
          setConnectError(error);
        }
      } else {
        // Not connected
        setConnectInfo({
          account: undefined,
          chainId: undefined,
          provider: undefined,
        });
      }
    }

    async function checkStatus() {
      if (status === 'connected' || status === 'disconnected') {
        await loadConnector();
        setIsCheckedWallet(true);
      }
    }

    checkStatus();
  }, [status, chain, activeConnector, address]);

  // Handle custom RPC from impersonator or URL params
  useEffect(() => {
    // Check for custom RPC in localStorage (from impersonator)
    const customRpc = localStorage.getItem('customArbitrumRpc');
    
    if (customRpc && connectInfo.provider) {
      console.log('Using custom Arbitrum RPC:', customRpc);
      
      // ethers v5 API
      const customProvider = new ethers.providers.JsonRpcProvider(customRpc, {
        chainId: arbitrum.id,
        name: 'arbitrum',
      });

      setConnectInfo(prev => ({
        ...prev,
        provider: customProvider,
      }));
    }
  }, [connectInfo.provider, connectInfo.chainId]);

  const contextValue: Web3ReactContextValue = {
    chainId: connectInfo.chainId,
    account: connectInfo.account,
    library: connectInfo.provider,
    active: !!activeConnector,
    error: connectError,
    isCheckedWallet,
    activate: connect,
    deactivate: async () => {
      await disconnectAsync();
    },
  };

  return (
    <Web3ReactContext.Provider value={contextValue}>
      {children}
    </Web3ReactContext.Provider>
  );
};

/**
 * useWeb3React Hook
 * Provides web3-react-like interface for accessing Web3 connection state
 * 
 * @example
 * const { account, chainId, library, active } = useWeb3React();
 */
export const useWeb3React = (): Web3ReactContextValue => {
  const context = useContext(Web3ReactContext);

  if (!context) {
    throw new Error('useWeb3React must be used within Web3ReactContextWrapper');
  }

  return context;
};

/**
 * Combined Provider
 * Use this as the single wrapper for your app
 * 
 * @example
 * <Web3Provider>
 *   <App />
 * </Web3Provider>
 */
export const Web3Provider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <RainbowKitContextWrapper>
      <Web3ReactContextWrapper>
        {children}
      </Web3ReactContextWrapper>
    </RainbowKitContextWrapper>
  );
};

/**
 * Helper hook to get provider and signer (for backward compatibility)
 * 
 * @example
 * const { provider, signer } = useProviderAndSigner();
 */
export const useProviderAndSigner = () => {
  const { library, account } = useWeb3React();
  const [provider, setProvider] = useState<ethers.providers.JsonRpcProvider | ethers.providers.Web3Provider | null>(null);
  const [signer, setSigner] = useState<ethers.providers.JsonRpcSigner | null>(null);

  useEffect(() => {
    if (library) {
      setProvider(library as any);
      
      // ethers v5: getSigner() is synchronous
      if (account && library instanceof ethers.providers.Web3Provider) {
        try {
          const ethersSigner = library.getSigner();
          setSigner(ethersSigner);
        } catch (error) {
          console.error('Failed to get signer:', error);
          setSigner(null);
        }
      } else {
        setSigner(null);
      }
    } else {
      setProvider(null);
      setSigner(null);
    }
  }, [library, account]);

  return { provider, signer };
};

