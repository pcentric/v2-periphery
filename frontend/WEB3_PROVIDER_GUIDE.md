# Web3 Provider Architecture Guide 🚀

Complete guide to the new Web3 provider architecture with `useWeb3React` hook.

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                   Web3Provider                      │
│  ┌───────────────────────────────────────────────┐  │
│  │     RainbowKitContextWrapper                  │  │
│  │  ┌─────────────────────────────────────────┐  │  │
│  │  │          WagmiProvider                  │  │  │
│  │  │  ┌───────────────────────────────────┐  │  │  │
│  │  │  │   QueryClientProvider            │  │  │  │
│  │  │  │  ┌─────────────────────────────┐  │  │  │  │
│  │  │  │  │   RainbowKitProvider        │  │  │  │  │
│  │  │  │  │  ┌───────────────────────┐  │  │  │  │  │
│  │  │  │  │  │ Web3ReactContext     │  │  │  │  │  │
│  │  │  │  │  │   Wrapper            │  │  │  │  │  │
│  │  │  │  │  │  ┌─────────────────┐ │  │  │  │  │  │
│  │  │  │  │  │  │   Your App      │ │  │  │  │  │  │
│  │  │  │  │  │  └─────────────────┘ │  │  │  │  │  │
│  │  │  │  │  └───────────────────────┘  │  │  │  │  │
│  │  │  │  └─────────────────────────────┘  │  │  │  │
│  │  │  └───────────────────────────────────┘  │  │  │
│  │  └─────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

## Key Components

### 1. Web3Provider (Main Export)

The all-in-one wrapper that combines everything you need:

```jsx
import { Web3Provider } from './providers/Web3Provider';

// In main.jsx
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Web3Provider>
      <App />
    </Web3Provider>
  </React.StrictMode>
);
```

### 2. useWeb3React Hook

Provides web3-react-like interface for accessing wallet state:

```jsx
import { useWeb3React } from './providers/Web3Provider';

function MyComponent() {
  const { 
    account,        // User's wallet address (string | undefined)
    chainId,        // Connected chain ID (number | undefined)
    library,        // Ethers.js provider (Web3Provider | JsonRpcProvider)
    active,         // Connection status (boolean)
    error,          // Connection error (any)
    isCheckedWallet,// Wallet check complete (boolean)
    activate,       // Connect function
    deactivate      // Disconnect function
  } = useWeb3React();

  if (!active) {
    return <p>Please connect wallet</p>;
  }

  return (
    <div>
      <p>Connected: {account}</p>
      <p>Chain: {chainId}</p>
    </div>
  );
}
```

### 3. useProviderAndSigner Hook

Helper hook for getting ethers provider and signer:

```jsx
import { useProviderAndSigner } from './providers/Web3Provider';

function MyComponent() {
  const { provider, signer } = useProviderAndSigner();

  const sendTransaction = async () => {
    if (!signer) return;
    
    const tx = await signer.sendTransaction({
      to: '0x...',
      value: ethers.utils.parseEther('0.1')
    });
    
    await tx.wait();
  };

  return <button onClick={sendTransaction}>Send</button>;
}
```

## Configuration

### Supported Chains

Currently configured for **Arbitrum only**:
- Arbitrum Mainnet (Chain ID: 42161)
- Arbitrum Sepolia (Chain ID: 421614)

### Wallet Connectors

The following wallets are supported:
- ✅ MetaMask
- ✅ Rabby Wallet
- ✅ Coinbase Wallet
- ✅ WalletConnect
- ✅ Trust Wallet
- ✅ Injected Wallets (Brave, etc.)

### RPC Endpoints

Default RPC URLs:
- **Arbitrum Mainnet**: `https://arb1.arbitrum.io/rpc`
- **Arbitrum Sepolia**: `https://sepolia-rollup.arbitrum.io/rpc`

## Usage Examples

### Example 1: Simple Connection Status

```jsx
import { useWeb3React } from './providers/Web3Provider';

function WalletStatus() {
  const { account, chainId, active } = useWeb3React();

  if (!active) {
    return <div>Not connected</div>;
  }

  return (
    <div>
      <p>Address: {account}</p>
      <p>Chain: {chainId === 42161 ? 'Arbitrum' : 'Unknown'}</p>
    </div>
  );
}
```

### Example 2: Reading Contract Data

```jsx
import { useWeb3React } from './providers/Web3Provider';
import { ethers } from 'ethers';
import ERC20_ABI from './abis/ERC20.json';

function TokenBalance({ tokenAddress }) {
  const { account, library } = useWeb3React();
  const [balance, setBalance] = useState('0');

  useEffect(() => {
    if (!library || !account) return;

    const contract = new ethers.Contract(
      tokenAddress,
      ERC20_ABI,
      library
    );

    contract.balanceOf(account).then(balance => {
      setBalance(ethers.utils.formatEther(balance));
    });
  }, [library, account, tokenAddress]);

  return <div>Balance: {balance}</div>;
}
```

### Example 3: Writing to Contracts

```jsx
import { useWeb3React } from './providers/Web3Provider';
import { ethers } from 'ethers';

function SwapButton() {
  const { library, account } = useWeb3React();

  const handleSwap = async () => {
    if (!library || !account) return;

    const signer = library.getSigner();
    const router = new ethers.Contract(
      ROUTER_ADDRESS,
      ROUTER_ABI,
      signer
    );

    const tx = await router.swapExactTokensForTokens(
      amountIn,
      amountOutMin,
      path,
      account,
      deadline
    );

    await tx.wait();
    console.log('Swap complete!');
  };

  return <button onClick={handleSwap}>Swap</button>;
}
```

### Example 4: Custom RPC (Impersonator)

The provider automatically checks for custom RPC in localStorage:

```jsx
// Set custom RPC (e.g., from impersonator modal)
localStorage.setItem('customArbitrumRpc', 'http://localhost:8545');

// The provider will automatically use it!
// No code changes needed in your components
```

## Migration from Old Code

### Before (Old Pattern)

```jsx
// ❌ OLD
function SwapComponent({ provider, signer }) {
  const [userAddress, setUserAddress] = useState('');

  useEffect(() => {
    if (signer) {
      signer.getAddress().then(setUserAddress);
    }
  }, [signer]);

  // ... component logic
}
```

### After (New Pattern)

```jsx
// ✅ NEW
function SwapComponent() {
  const { account, library } = useWeb3React();
  const provider = library;
  const signer = library && account ? library.getSigner() : null;

  // ... component logic (same as before!)
}
```

## Advanced Usage

### Custom Theme

Modify the RainbowKit theme in `Web3Provider.tsx`:

```typescript
const customTheme = darkTheme({
  accentColor: '#FF007A',        // Your brand color
  accentColorForeground: 'white',
  borderRadius: 'medium',
  fontStack: 'system',
  overlayBlur: 'small',
});
```

### Add More Chains

To support additional chains:

```typescript
// In Web3Provider.tsx
import { mainnet, optimism } from 'wagmi/chains';

const chains = [
  arbitrum, 
  arbitrumSepolia,
  mainnet,      // Add Ethereum
  optimism      // Add Optimism
] as const;

// Update transports
const wagmiConfig = createConfig({
  chains,
  connectors,
  transports: {
    [arbitrum.id]: http('https://arb1.arbitrum.io/rpc'),
    [arbitrumSepolia.id]: http('https://sepolia-rollup.arbitrum.io/rpc'),
    [mainnet.id]: http('https://eth.llamarpc.com'),
    [optimism.id]: http('https://mainnet.optimism.io'),
  },
});
```

### Add More Wallets

```typescript
import { ledgerWallet, argentWallet } from '@rainbow-me/rainbowkit/wallets';

const connectors = connectorsForWallets(
  [
    {
      groupName: 'Recommended',
      wallets: [
        metaMaskWallet,
        rabbyWallet,
        ledgerWallet,      // Add Ledger
        argentWallet,      // Add Argent
        // ... more wallets
      ],
    },
  ],
  { appName: 'Your App', projectId }
);
```

## Troubleshooting

### Issue: "useWeb3React must be used within Web3ReactContextWrapper"

**Solution**: Ensure your app is wrapped with `<Web3Provider>`:

```jsx
// main.jsx
<Web3Provider>
  <App />
</Web3Provider>
```

### Issue: Provider is undefined

**Solution**: Wait for the provider to be ready:

```jsx
const { library, isCheckedWallet } = useWeb3React();

if (!isCheckedWallet) {
  return <div>Loading...</div>;
}

if (!library) {
  return <div>Please connect wallet</div>;
}
```

### Issue: Wrong network

**Solution**: Use RainbowKit's built-in network switcher or programmatically switch:

```jsx
import { useSwitchChain } from 'wagmi';

function NetworkSwitcher() {
  const { switchChain } = useSwitchChain();

  return (
    <button onClick={() => switchChain({ chainId: 42161 })}>
      Switch to Arbitrum
    </button>
  );
}
```

### Issue: Transactions failing

**Solution**: Check gas limits and ensure correct chain:

```jsx
const { chainId } = useWeb3React();

if (chainId !== 42161) {
  alert('Please switch to Arbitrum');
  return;
}

const tx = await contract.method({
  gasLimit: 200000, // Set explicit gas limit
});
```

## Best Practices

### 1. Always Check Connection State

```jsx
const { active, account, library } = useWeb3React();

if (!active) {
  return <ConnectWalletButton />;
}

if (!account || !library) {
  return <div>Loading...</div>;
}

// Proceed with connected logic
```

### 2. Handle Errors Gracefully

```jsx
const { error } = useWeb3React();

if (error) {
  if (error === 'unsupported') {
    return <div>Unsupported network. Please switch to Arbitrum.</div>;
  }
  return <div>Connection error: {error.message}</div>;
}
```

### 3. Use Loading States

```jsx
const { isCheckedWallet } = useWeb3React();

if (!isCheckedWallet) {
  return <LoadingSpinner />;
}
```

### 4. Cleanup on Disconnect

```jsx
useEffect(() => {
  if (!active) {
    // Reset component state on disconnect
    setBalance(null);
    setTokens([]);
  }
}, [active]);
```

## Performance Tips

1. **Memoize providers**: The library is already memoized in the context
2. **Batch contract calls**: Use multicall for multiple reads
3. **Cache data**: Use React Query for caching contract data
4. **Lazy load components**: Code-split wallet-dependent components

```jsx
// Lazy load heavy components
const SwapComponent = React.lazy(() => import('./components/SwapComponent'));

function App() {
  const { active } = useWeb3React();

  return (
    <Suspense fallback={<Loading />}>
      {active && <SwapComponent />}
    </Suspense>
  );
}
```

## Summary

The new `useWeb3React` architecture provides:

✅ **Simpler Code**: No manual provider/signer setup  
✅ **Better DX**: Familiar web3-react-like API  
✅ **Type Safety**: Full TypeScript support  
✅ **Modern Stack**: RainbowKit + wagmi v2  
✅ **Backward Compatible**: Works with existing ethers.js code  
✅ **Flexible**: Easy to customize and extend  

---

**You're all set! Start building with `useWeb3React()` 🎉**

