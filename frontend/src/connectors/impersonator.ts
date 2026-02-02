import { createConnector } from 'wagmi';
import { type Address, type Hex } from 'viem';

interface ImpersonatorOptions {
  initialAddress?: Address;
  customRpcUrl?: string;
}

// Global state for custom RPC (only for Arbitrum chains)
let globalCustomRpcUrl: string | undefined;

export function setCustomArbitrumRpc(rpcUrl: string | undefined) {
  globalCustomRpcUrl = rpcUrl;
}

export function getCustomArbitrumRpc(): string | undefined {
  return globalCustomRpcUrl;
}

export function impersonator(options: ImpersonatorOptions = {}) {
  let currentAddress: Address | undefined = options.initialAddress;
  let listeners: Array<() => void> = [];
  
  if (options.customRpcUrl) {
    globalCustomRpcUrl = options.customRpcUrl;
  }

  return createConnector<any>((config) => ({
    id: 'impersonator',
    name: 'Account Impersonator',
    type: 'injected',
    
    connect: async (parameters) => {
      const address = currentAddress || '0x0000000000000000000000000000000000000000' as Address;
      const chain = parameters?.chainId ? config.chains.find(c => c.id === parameters.chainId) : config.chains[0];
      
      // Handle withCapabilities parameter
      const accounts = parameters?.withCapabilities
        ? ([{ address, capabilities: {} }] as const)
        : ([address] as const);
      
      return {
        accounts,
        chainId: chain?.id || config.chains[0].id,
      } as any;
    },

    async disconnect() {
      currentAddress = undefined;
      listeners = [];
    },

    async getAccounts() {
      if (!currentAddress) return [];
      return [currentAddress];
    },

    async getChainId() {
      return config.chains[0].id;
    },

    async isAuthorized() {
      return !!currentAddress;
    },

    async switchChain({ chainId }) {
      const chain = config.chains.find(c => c.id === chainId);
      if (!chain) throw new Error(`Chain ${chainId} not configured`);
      
      // Emit chainChanged event
      listeners.forEach(listener => listener());
      
      return chain;
    },

    onAccountsChanged(accounts) {
      // Handle account changes
    },

    onChainChanged(chain) {
      // Handle chain changes
    },

    onDisconnect(error) {
      // Handle disconnect
    },

    async getProvider() {
      // Return a minimal provider object
      return {
        request: async ({ method, params }: { method: string; params?: any[] }) => {
          if (method === 'eth_accounts') {
            return currentAddress ? [currentAddress] : [];
          }
          if (method === 'eth_chainId') {
            return `0x${config.chains[0].id.toString(16)}`;
          }
          if (method === 'eth_requestAccounts') {
            return currentAddress ? [currentAddress] : [];
          }
          // For signing methods, we can't actually sign in impersonation mode
          if (method === 'eth_sign' || method === 'personal_sign' || 
              method === 'eth_signTypedData' || method === 'eth_signTypedData_v4' ||
              method === 'eth_sendTransaction') {
            throw new Error('Impersonator cannot sign transactions. Use a real wallet or Foundry fork with unlocked accounts.');
          }
          
          throw new Error(`Method ${method} not supported in impersonator mode`);
        },
        on: (event: string, listener: any) => {
          listeners.push(listener);
        },
        removeListener: (event: string, listener: any) => {
          listeners = listeners.filter(l => l !== listener);
        },
      };
    },

    // Custom method to set the impersonated address
    setAddress(address: Address) {
      currentAddress = address;
      listeners.forEach(listener => listener());
    },

    getAddress() {
      return currentAddress;
    },
  }));
}

