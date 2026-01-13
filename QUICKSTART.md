# Quick Start Guide - Uniswap V2 Frontend Integration

This guide will help you get the frontend running with your deployed Uniswap V2 contracts in just a few steps.

## Prerequisites Checklist

- [ ] Node.js v16 or higher installed
- [ ] MetaMask browser extension installed
- [ ] Uniswap V2 contracts deployed (check `deployment.json`)

## Step 1: Install Frontend Dependencies

```bash
cd frontend
npm install
```

This will install:
- React 18
- Ethers.js v5
- Vite (build tool)
- Required dev dependencies

## Step 2: Verify Contract Addresses

Check that the contract addresses in `frontend/src/config/contracts.js` match your deployment:

```javascript
// Should match deployment.json
export const CONTRACT_ADDRESSES = {
  WETH: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  FACTORY: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
  ROUTER: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0'
};
```

## Step 3: Start Local Blockchain (if using Hardhat)

```bash
# In the project root directory (v2-periphery/)
npx hardhat node
```

Keep this terminal running. The node will display test accounts with ETH.

## Step 4: Configure MetaMask

1. Open MetaMask
2. Click network dropdown → "Add Network" → "Add a network manually"
3. Enter:
   - **Network Name**: Hardhat Local
   - **RPC URL**: `http://127.0.0.1:8545`
   - **Chain ID**: `31337`
   - **Currency Symbol**: ETH

4. Import a test account:
   - Copy a private key from the Hardhat node output
   - MetaMask → Click account icon → Import Account → Paste private key

## Step 5: Start Frontend

```bash
cd frontend
npm run dev
```

The app will open at `http://localhost:5173`

## Step 6: Connect Wallet

1. Click "Connect Wallet" button
2. MetaMask will pop up → Click "Connect"
3. Approve the connection

## Step 7: Test Token Swap (Example)

To test swapping, you'll need test tokens:

### Option A: Deploy Test Tokens (Recommended)

Create a script `scripts/deploy-test-tokens.js`:

```javascript
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  // Deploy test token A
  const TokenA = await hre.ethers.getContractFactory("ERC20");
  const tokenA = await TokenA.deploy("Test Token A", "TKA", hre.ethers.utils.parseEther("1000000"));
  await tokenA.deployed();

  // Deploy test token B
  const TokenB = await hre.ethers.getContractFactory("ERC20");
  const tokenB = await TokenB.deploy("Test Token B", "TKB", hre.ethers.utils.parseEther("1000000"));
  await tokenB.deployed();

  console.log("Token A deployed to:", tokenA.address);
  console.log("Token B deployed to:", tokenB.address);

  // Add initial liquidity
  const router = await hre.ethers.getContractAt(
    "IUniswapV2Router02",
    "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0" // Your router address
  );

  const amountA = hre.ethers.utils.parseEther("100");
  const amountB = hre.ethers.utils.parseEther("100");

  await tokenA.approve(router.address, amountA);
  await tokenB.approve(router.address, amountB);

  await router.addLiquidity(
    tokenA.address,
    tokenB.address,
    amountA,
    amountB,
    0,
    0,
    deployer.address,
    Date.now() + 1000 * 60 * 10
  );

  console.log("Initial liquidity added!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

Run it:
```bash
npx hardhat run scripts/deploy-test-tokens.js --network localhost
```

### Option B: Use WETH

You can also swap with the deployed WETH contract at `0x5FbDB2315678afecb367f032d93F642f64180aa3`

## Step 8: Perform Your First Swap

1. In the frontend, enter:
   - **From**: Token A address (from Step 7)
   - **To**: Token B address (from Step 7)
   - **Amount**: e.g., "1"

2. Click "Approve" → Confirm in MetaMask
3. Wait for approval confirmation
4. Click "Swap" → Confirm in MetaMask
5. Wait for swap confirmation

## Directory Structure Overview

```
v2-periphery/
├── contracts/          # Solidity contracts
├── scripts/           # Deployment scripts
├── frontend/          # React frontend ← YOUR INTEGRATION
│   ├── src/
│   │   ├── components/   # Swap & Liquidity components
│   │   ├── hooks/        # useRouter, usePair, useToken
│   │   ├── utils/        # Calculations
│   │   └── config/       # Contract addresses & ABIs
│   └── package.json
├── frontend-abis/     # Extracted ABIs for frontend
├── deployment.json    # Deployed contract addresses
└── deployed-config.js # JS config for frontend
```

## Common Issues

### Issue: "Please switch to hardhat network"

**Solution**: Make sure MetaMask is connected to the Hardhat Local network (Chain ID: 31337)

### Issue: "Connect Wallet" button doesn't work

**Solution**:
- Refresh the page
- Make sure MetaMask is installed
- Try disconnecting and reconnecting in MetaMask settings

### Issue: "Insufficient Liquidity"

**Solution**:
- Make sure you've deployed test tokens
- Add initial liquidity using the liquidity tab or deployment script
- Check that the token addresses are correct

### Issue: Transaction fails with "INSUFFICIENT_OUTPUT_AMOUNT"

**Solution**: Increase slippage tolerance in the UI (drag the slider)

## Next Steps

Now that your frontend is running:

1. **Explore the Components**:
   - Check `frontend/src/components/SwapComponent.jsx`
   - Check `frontend/src/components/LiquidityComponent.jsx`

2. **Customize the UI**:
   - Edit `frontend/src/assets/styles.css`
   - Modify components to match your design

3. **Add Features**:
   - Token search/selection
   - Transaction history
   - Price charts
   - Multi-hop routing

4. **Deploy to Production**:
   - Update `NETWORK_CONFIG` in `config/contracts.js`
   - Build: `npm run build`
   - Deploy the `dist/` folder

## File Reference

Key files you'll work with:

| File | Purpose |
|------|---------|
| `frontend/src/config/contracts.js` | Contract addresses & configuration |
| `frontend/src/hooks/useRouter.js` | Router contract interactions |
| `frontend/src/hooks/usePair.js` | Pair contract interactions |
| `frontend/src/hooks/useToken.js` | Token approvals & balances |
| `frontend/src/utils/calculations.js` | Price calculations |
| `frontend/src/components/SwapComponent.jsx` | Swap UI |
| `frontend/src/components/LiquidityComponent.jsx` | Liquidity UI |

## Getting Help

- Check the [Frontend README](frontend/README.md) for detailed documentation
- Review the [Integration Guide](FRONTEND_INTEGRATION_GUIDE.md) for contract details
- Look at example usage in the components

## Summary

You've successfully:
- ✅ Installed frontend dependencies
- ✅ Configured MetaMask for local development
- ✅ Connected your wallet
- ✅ Tested token swapping
- ✅ Learned the project structure

Your Uniswap V2 frontend is now fully integrated with your deployed contracts!
