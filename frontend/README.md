# Uniswap V2 Frontend Integration Example

A complete React-based frontend integration example for Uniswap V2 Periphery contracts, demonstrating token swapping and liquidity management.

## Features

- Token swapping with price impact calculation
- Add/remove liquidity
- Token approval management
- Real-time reserve fetching
- MetaMask wallet integration
- Slippage tolerance configuration
- Complete React hooks for contract interactions

## Project Structure

```
frontend/
├── src/
│   ├── components/          # React components
│   │   ├── SwapComponent.jsx       # Token swap UI
│   │   └── LiquidityComponent.jsx  # Liquidity management UI
│   ├── hooks/              # Custom React hooks
│   │   ├── useRouter.js           # Router contract interactions
│   │   ├── usePair.js             # Pair contract interactions
│   │   └── useToken.js            # ERC20 token interactions
│   ├── utils/              # Utility functions
│   │   └── calculations.js        # Price/liquidity calculations
│   ├── config/             # Configuration
│   │   └── contracts.js           # Contract addresses & ABIs
│   ├── assets/             # Static assets
│   │   └── styles.css            # Styling
│   ├── App.jsx             # Main application component
│   └── main.jsx            # Entry point
├── index.html              # HTML template
├── vite.config.js          # Vite configuration
└── package.json            # Dependencies
```

## Prerequisites

- Node.js v16+ and npm/yarn
- MetaMask or another Web3 wallet
- Access to a running Ethereum node (local Hardhat or testnet)

## Installation

1. **Install dependencies:**

```bash
cd frontend
npm install
```

2. **Configure contract addresses:**

The deployed contract addresses are automatically loaded from `deployed-config.js`. If you've redeployed contracts, update the addresses in:

`src/config/contracts.js`:
```javascript
export const CONTRACT_ADDRESSES = {
  WETH: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  FACTORY: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
  ROUTER: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0'
};
```

## Running the Application

### Development Mode

```bash
npm run dev
```

The application will start at `http://localhost:5173`

### Production Build

```bash
npm run build
npm run preview
```

## Using with Local Hardhat Network

1. **Start Hardhat node:**

```bash
# In the v2-periphery root directory
npx hardhat node
```

2. **Deploy contracts:**

```bash
npx hardhat run scripts/deploy.js --network localhost
```

3. **Configure MetaMask:**
   - Network Name: Hardhat Local
   - RPC URL: `http://127.0.0.1:8545`
   - Chain ID: `31337`
   - Currency Symbol: ETH

4. **Import test account:**

Import one of the Hardhat test accounts into MetaMask using the private key shown when you start the node.

## Contract Interactions

### Swapping Tokens

```javascript
import { useRouter } from './hooks/useRouter';

const { swapExactTokensForTokens } = useRouter(provider, signer);

// Swap 1 TokenA for TokenB
await swapExactTokensForTokens(
  amountIn,        // Input amount
  amountOutMin,    // Minimum output (with slippage)
  [tokenA, tokenB], // Path
  deadline         // Transaction deadline
);
```

### Adding Liquidity

```javascript
const { addLiquidity } = useRouter(provider, signer);

await addLiquidity(
  tokenA,
  tokenB,
  amountADesired,
  amountBDesired,
  slippageBps,
  deadline
);
```

### Removing Liquidity

```javascript
const { removeLiquidity } = useRouter(provider, signer);

await removeLiquidity(
  tokenA,
  tokenB,
  liquidity,
  amountAMin,
  amountBMin,
  deadline
);
```

## Custom Hooks

### useRouter

Provides methods to interact with UniswapV2Router02:
- `swapExactTokensForTokens` - Swap exact input amount
- `swapTokensForExactTokens` - Swap for exact output amount
- `swapExactETHForTokens` - Swap ETH for tokens
- `swapTokensForExactETH` - Swap tokens for exact ETH
- `addLiquidity` - Add liquidity to a pair
- `removeLiquidity` - Remove liquidity from a pair
- `getAmountsOut` - Calculate output amounts
- `getAmountsIn` - Calculate input amounts

### usePair

Provides methods to interact with pair contracts:
- `fetchReserves` - Get current reserves
- `getOrderedReserves` - Get reserves ordered by input tokens
- `getBalance` - Get LP token balance
- `getTotalSupply` - Get total LP token supply
- `pairExists` - Check if pair exists

### useToken

Provides methods to interact with ERC20 tokens:
- `getBalance` - Get token balance
- `getAllowance` - Get spending allowance
- `approve` - Approve token spending
- `approveMax` - Approve maximum amount
- `needsApproval` - Check if approval needed
- `ensureApproval` - Approve if needed

## Utility Functions

### Calculations (`utils/calculations.js`)

- `getAmountOut` - Calculate output amount using constant product formula
- `getAmountIn` - Calculate required input amount
- `calculatePriceImpact` - Calculate trade price impact
- `applySlippage` - Apply slippage tolerance
- `formatTokenAmount` - Format amounts for display
- `parseTokenAmount` - Parse user input to BigNumber
- `calculateOptimalLiquidityAmounts` - Calculate optimal liquidity ratios
- `calculateLiquidityShare` - Calculate LP token share
- `computePairAddress` - Compute pair address using CREATE2

## Configuration

### Slippage Tolerance

Default slippage is set to 0.5% (50 basis points). Users can adjust this in the UI:

```javascript
export const DEFAULT_SLIPPAGE = 50; // 0.5%
```

### Gas Limits

Gas limits for different operations are configured in `config/contracts.js`:

```javascript
export const GAS_LIMITS = {
  SWAP: 200000,
  ADD_LIQUIDITY: 300000,
  REMOVE_LIQUIDITY: 300000,
  APPROVE: 100000
};
```

### Transaction Deadline

Default deadline is 20 minutes (1200 seconds):

```javascript
export const DEFAULT_DEADLINE = 1200;
```

## Deployed Contracts

Current deployment on Hardhat local network (Chain ID: 31337):

| Contract | Address |
|----------|---------|
| WETH9 | `0x5FbDB2315678afecb367f032d93F642f64180aa3` |
| UniswapV2Factory | `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512` |
| UniswapV2Router02 | `0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0` |

## Testing Token Swaps

1. Deploy test ERC20 tokens
2. Create a pair through the factory
3. Add initial liquidity
4. Enter token addresses in the swap interface
5. Approve tokens for the router
6. Execute swap

## Common Issues & Solutions

### "Insufficient Liquidity" Error

- Ensure the pair exists and has liquidity
- Check that you've added liquidity to the pair first

### "Transfer Amount Exceeds Allowance" Error

- Click the "Approve" button before swapping
- Ensure approval transaction has been confirmed

### "Transaction Failed" Error

- Check slippage tolerance (increase if needed)
- Verify token addresses are correct
- Ensure you have enough balance

### MetaMask Not Connecting

- Make sure MetaMask is installed
- Check you're on the correct network
- Refresh the page and try again

## Integration Guide

To integrate this into your own project:

1. **Copy the hooks and utilities:**
   - `hooks/useRouter.js`
   - `hooks/usePair.js`
   - `hooks/useToken.js`
   - `utils/calculations.js`

2. **Copy the configuration:**
   - `config/contracts.js` (update addresses)

3. **Copy the ABIs:**
   - Use the `frontend-abis` package

4. **Implement in your components:**

```javascript
import { useRouter } from './hooks/useRouter';
import { useToken } from './hooks/useToken';
import { usePair } from './hooks/usePair';

function YourComponent({ provider, signer }) {
  const router = useRouter(provider, signer);
  const token = useToken(tokenAddress, provider, signer);
  const pair = usePair(tokenA, tokenB, provider);

  // Your implementation
}
```

## Security Considerations

- Always verify contract addresses before interacting
- Test with small amounts first
- Set appropriate slippage tolerance
- Check price impact before large trades
- Never share private keys or seed phrases
- Verify transaction details in MetaMask before confirming

## Additional Resources

- [Uniswap V2 Documentation](https://docs.uniswap.org/protocol/V2/introduction)
- [Ethers.js Documentation](https://docs.ethers.org/)
- [React Documentation](https://react.dev/)

## License

GPL-3.0-or-later

## Support

For issues or questions, please refer to the [main project repository](https://github.com/Uniswap/v2-periphery).
