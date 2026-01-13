# Uniswap V2 Frontend Integration Guide

## Overview
This guide provides all the necessary contracts, ABIs, and configuration needed to integrate a frontend with Uniswap V2 Periphery contracts.

---

## Required Contracts for Frontend

### 1. Core Contracts (v2-core)
These contracts are deployed on-chain and your frontend needs their ABIs to interact with them.

**Location**: `node_modules/@uniswap/v2-core/build/`

| Contract | Purpose | ABI Path |
|----------|---------|----------|
| **UniswapV2Factory** | Creates trading pairs | `node_modules/@uniswap/v2-core/build/UniswapV2Factory.json` |
| **UniswapV2Pair** | Individual liquidity pool | `node_modules/@uniswap/v2-core/build/UniswapV2Pair.json` |
| **IUniswapV2Factory** | Factory interface | `node_modules/@uniswap/v2-core/build/IUniswapV2Factory.json` |
| **IUniswapV2Pair** | Pair interface | `node_modules/@uniswap/v2-core/build/IUniswapV2Pair.json` |
| **IUniswapV2ERC20** | ERC20 interface with permit | `node_modules/@uniswap/v2-core/build/IUniswapV2ERC20.json` |

### 2. Periphery Contracts (v2-periphery)
Your main interaction contracts for swaps and liquidity management.

**Location**: `build/`

| Contract | Purpose | ABI Path | Priority |
|----------|---------|----------|----------|
| **UniswapV2Router02** | Main router (use this) | `build/UniswapV2Router02.json` | **CRITICAL** |
| **IUniswapV2Router02** | Router interface | `build/IUniswapV2Router02.json` | **CRITICAL** |
| **UniswapV2Migrator** | V1→V2 migration | `build/UniswapV2Migrator.json` | Optional |
| **WETH9** | Wrapped ETH | `build/WETH9.json` | **CRITICAL** |
| **IERC20** | Standard token interface | `build/IERC20.json` | **CRITICAL** |
| **IWETH** | WETH interface | `build/IWETH.json` | **CRITICAL** |

### 3. Library Contracts (for reference/calculations)
Used for off-chain price calculations and utilities.

| Contract | Purpose | ABI Path |
|----------|---------|----------|
| **UniswapV2Library** | Price calculations | `build/UniswapV2Library.json` |
| **UniswapV2OracleLibrary** | TWAP oracle utilities | `build/UniswapV2OracleLibrary.json` |
| **UniswapV2LiquidityMathLibrary** | Liquidity math | `build/UniswapV2LiquidityMathLibrary.json` |

### 4. Example Contracts (optional)
Advanced features for specific use cases.

| Contract | Purpose | ABI Path |
|----------|---------|----------|
| **ExampleFlashSwap** | Flash swap example | `build/ExampleFlashSwap.json` |
| **ExampleOracleSimple** | Simple price oracle | `build/ExampleOracleSimple.json` |
| **ExampleSlidingWindowOracle** | TWAP oracle | `build/ExampleSlidingWindowOracle.json` |
| **ExampleSwapToPrice** | Arbitrage helper | `build/ExampleSwapToPrice.json` |
| **ExampleComputeLiquidityValue** | Liquidity value calculator | `build/ExampleComputeLiquidityValue.json` |

---

## Key Contract Addresses (You Need to Deploy)

Since this is a fork, you'll need to deploy these contracts to your target network:

### Deployment Order:
1. **Deploy WETH9** (or use existing WETH on your network)
2. **Deploy UniswapV2Factory** (from v2-core)
3. **Deploy UniswapV2Router02** (requires Factory and WETH addresses)

### Example Configuration:
```javascript
// config.js
export const contracts = {
  // Replace with your deployed addresses
  factory: '0x...', // UniswapV2Factory address
  router: '0x...', // UniswapV2Router02 address
  weth: '0x...', // WETH9 address

  // Init code hash for pair address calculation
  initCodeHash: '0x96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f'
}
```

---

## Frontend Integration Steps

### Step 1: Import ABIs
```javascript
// Import necessary ABIs
import UniswapV2Router02 from './build/UniswapV2Router02.json'
import IUniswapV2Factory from '../node_modules/@uniswap/v2-core/build/IUniswapV2Factory.json'
import IUniswapV2Pair from '../node_modules/@uniswap/v2-core/build/IUniswapV2Pair.json'
import IERC20 from './build/IERC20.json'
import IWETH from './build/IWETH.json'
```

### Step 2: Initialize Contract Instances
```javascript
import { ethers } from 'ethers'

// Connect to provider
const provider = new ethers.providers.Web3Provider(window.ethereum)
const signer = provider.getSigner()

// Initialize contracts
const router = new ethers.Contract(
  contracts.router,
  UniswapV2Router02.abi,
  signer
)

const factory = new ethers.Contract(
  contracts.factory,
  IUniswapV2Factory.abi,
  provider
)
```

### Step 3: Common Operations

#### A. Swap Tokens
```javascript
// Swap exact tokens for tokens
async function swapTokens(tokenIn, tokenOut, amountIn, minAmountOut, recipient) {
  const path = [tokenIn, tokenOut]
  const deadline = Math.floor(Date.now() / 1000) + 60 * 20 // 20 minutes

  const tx = await router.swapExactTokensForTokens(
    amountIn,
    minAmountOut,
    path,
    recipient,
    deadline
  )
  return tx.wait()
}

// Swap ETH for tokens
async function swapETHForTokens(tokenOut, amountETH, minAmountOut, recipient) {
  const path = [contracts.weth, tokenOut]
  const deadline = Math.floor(Date.now() / 1000) + 60 * 20

  const tx = await router.swapExactETHForTokens(
    minAmountOut,
    path,
    recipient,
    deadline,
    { value: amountETH }
  )
  return tx.wait()
}

// Swap tokens for ETH
async function swapTokensForETH(tokenIn, amountIn, minAmountOut, recipient) {
  const path = [tokenIn, contracts.weth]
  const deadline = Math.floor(Date.now() / 1000) + 60 * 20

  const tx = await router.swapExactTokensForETH(
    amountIn,
    minAmountOut,
    path,
    recipient,
    deadline
  )
  return tx.wait()
}
```

#### B. Add Liquidity
```javascript
// Add liquidity for token pair
async function addLiquidity(
  tokenA,
  tokenB,
  amountADesired,
  amountBDesired,
  amountAMin,
  amountBMin,
  recipient
) {
  const deadline = Math.floor(Date.now() / 1000) + 60 * 20

  const tx = await router.addLiquidity(
    tokenA,
    tokenB,
    amountADesired,
    amountBDesired,
    amountAMin,
    amountBMin,
    recipient,
    deadline
  )
  return tx.wait()
}

// Add liquidity with ETH
async function addLiquidityETH(
  token,
  amountTokenDesired,
  amountTokenMin,
  amountETHMin,
  recipient,
  amountETH
) {
  const deadline = Math.floor(Date.now() / 1000) + 60 * 20

  const tx = await router.addLiquidityETH(
    token,
    amountTokenDesired,
    amountTokenMin,
    amountETHMin,
    recipient,
    deadline,
    { value: amountETH }
  )
  return tx.wait()
}
```

#### C. Remove Liquidity
```javascript
// Remove liquidity
async function removeLiquidity(
  tokenA,
  tokenB,
  liquidity,
  amountAMin,
  amountBMin,
  recipient
) {
  const deadline = Math.floor(Date.now() / 1000) + 60 * 20

  const tx = await router.removeLiquidity(
    tokenA,
    tokenB,
    liquidity,
    amountAMin,
    amountBMin,
    recipient,
    deadline
  )
  return tx.wait()
}

// Remove liquidity for ETH
async function removeLiquidityETH(
  token,
  liquidity,
  amountTokenMin,
  amountETHMin,
  recipient
) {
  const deadline = Math.floor(Date.now() / 1000) + 60 * 20

  const tx = await router.removeLiquidityETH(
    token,
    liquidity,
    amountTokenMin,
    amountETHMin,
    recipient,
    deadline
  )
  return tx.wait()
}
```

#### D. Get Pair Information
```javascript
// Get pair address
async function getPairAddress(tokenA, tokenB) {
  return await factory.getPair(tokenA, tokenB)
}

// Get reserves
async function getReserves(pairAddress) {
  const pair = new ethers.Contract(pairAddress, IUniswapV2Pair.abi, provider)
  const reserves = await pair.getReserves()
  return {
    reserve0: reserves[0],
    reserve1: reserves[1],
    blockTimestampLast: reserves[2]
  }
}

// Calculate output amount
async function getAmountOut(amountIn, path) {
  const amounts = await router.getAmountsOut(amountIn, path)
  return amounts[amounts.length - 1]
}
```

#### E. Token Approvals
```javascript
// Approve router to spend tokens
async function approveToken(tokenAddress, amount) {
  const token = new ethers.Contract(tokenAddress, IERC20.abi, signer)
  const tx = await token.approve(contracts.router, amount)
  return tx.wait()
}

// Check allowance
async function getAllowance(tokenAddress, owner) {
  const token = new ethers.Contract(tokenAddress, IERC20.abi, provider)
  return await token.allowance(owner, contracts.router)
}
```

---

## Important Constants

### Init Code Hash
Used for calculating pair addresses off-chain:
```
0x96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f
```

This is hardcoded in `UniswapV2Library.sol:24`

### Fee Structure
- **Trading fee**: 0.3% (30 basis points)
- **LP share**: 100% of fees go to liquidity providers

---

## Router Functions Reference

### Swap Functions
- `swapExactTokensForTokens` - Swap exact input amount
- `swapTokensForExactTokens` - Swap for exact output amount
- `swapExactETHForTokens` - Swap ETH for tokens
- `swapTokensForExactETH` - Swap tokens for exact ETH
- `swapExactTokensForETH` - Swap tokens for ETH
- `swapETHForExactTokens` - Swap exact ETH for tokens

### Swap Functions (Fee-on-Transfer Tokens)
- `swapExactTokensForTokensSupportingFeeOnTransferTokens`
- `swapExactETHForTokensSupportingFeeOnTransferTokens`
- `swapExactTokensForETHSupportingFeeOnTransferTokens`

### Liquidity Functions
- `addLiquidity` - Add liquidity for token pair
- `addLiquidityETH` - Add liquidity with ETH
- `removeLiquidity` - Remove liquidity
- `removeLiquidityETH` - Remove liquidity and receive ETH
- `removeLiquidityWithPermit` - Remove with gasless approval
- `removeLiquidityETHWithPermit` - Remove ETH with gasless approval

### Query Functions
- `factory()` - Get factory address
- `WETH()` - Get WETH address
- `quote(amountA, reserveA, reserveB)` - Calculate equivalent amount
- `getAmountOut(amountIn, reserveIn, reserveOut)` - Calculate output
- `getAmountIn(amountOut, reserveIn, reserveOut)` - Calculate required input
- `getAmountsOut(amountIn, path)` - Calculate multi-hop output
- `getAmountsIn(amountOut, path)` - Calculate multi-hop input

---

## Critical ABIs to Include in Frontend

### Minimum Required:
1. **UniswapV2Router02.json** (414 KB) - Main router contract
2. **IUniswapV2Factory.json** - Factory interface
3. **IUniswapV2Pair.json** - Pair interface
4. **IERC20.json** - Token interface
5. **IWETH.json** - WETH interface

### Recommended for Advanced Features:
6. **UniswapV2Library.json** - Off-chain calculations
7. **ExampleSlidingWindowOracle.json** - Price oracle
8. **ExampleFlashSwap.json** - Flash swaps

---

## Security Considerations

1. **Always set deadline**: Typically 10-20 minutes from now
2. **Slippage protection**: Use `amountMin` parameters
3. **Check allowances**: Before swaps, ensure router has approval
4. **Validate addresses**: Ensure token addresses are correct
5. **Front-running protection**: Consider private transactions for large swaps
6. **Gas estimation**: Test transactions with `estimateGas()` first

---

## Testing

Run the test suite to verify everything works:

```bash
yarn test
```

Tests are located in `/test` directory covering:
- Router operations
- Liquidity management
- Flash swaps
- Oracle functionality
- Migration from V1

---

## Deployment Script (Example)

```javascript
// deploy.js
const { ethers } = require('hardhat')

async function main() {
  // 1. Deploy or get WETH address
  const wethAddress = '0x...' // Use existing WETH or deploy

  // 2. Deploy Factory (from v2-core)
  const Factory = await ethers.getContractFactory('UniswapV2Factory')
  const factory = await Factory.deploy(deployer.address) // feeToSetter
  await factory.deployed()
  console.log('Factory:', factory.address)

  // 3. Deploy Router02
  const Router = await ethers.getContractFactory('UniswapV2Router02')
  const router = await Router.deploy(factory.address, wethAddress)
  await router.deployed()
  console.log('Router02:', router.address)

  console.log('\nSave these addresses for frontend config!')
}

main()
```

---

## Next Steps

1. **Deploy contracts** to your target network (testnet first)
2. **Copy ABIs** from `build/` to your frontend project
3. **Update config** with deployed contract addresses
4. **Test swaps** on testnet with test tokens
5. **Implement UI** using the example functions above
6. **Add slippage controls** in your frontend
7. **Test thoroughly** before mainnet deployment

---

## Support Files

All ABIs are located in:
- `/build/` - Periphery contracts (this repo)
- `/node_modules/@uniswap/v2-core/build/` - Core contracts

You can copy the entire `build/` folder to your frontend project or selectively import needed ABIs.

---

## Additional Resources

- **Uniswap V2 Docs**: https://docs.uniswap.org/contracts/v2/overview
- **Solidity Version**: 0.6.6
- **License**: GPL-3.0-or-later
- **Compiler**: solc 0.6.6 with 999999 optimizer runs

---

## Contract Structure Summary

```
v2-periphery/
├── UniswapV2Router02.sol (PRIMARY - Use this for all frontend interactions)
├── UniswapV2Router01.sol (Legacy - Don't use)
├── UniswapV2Migrator.sol (Optional - For V1→V2 migration)
├── libraries/
│   ├── UniswapV2Library.sol (Calculations)
│   ├── SafeMath.sol (Math operations)
│   ├── UniswapV2OracleLibrary.sol (TWAP)
│   └── UniswapV2LiquidityMathLibrary.sol (Liquidity math)
├── examples/ (Optional - Advanced features)
└── interfaces/
    ├── IUniswapV2Router02.sol (Router interface)
    ├── IERC20.sol (Token interface)
    └── IWETH.sol (WETH interface)

v2-core/ (dependency)
├── UniswapV2Factory.sol (Creates pairs)
├── UniswapV2Pair.sol (Liquidity pool)
└── interfaces/
    ├── IUniswapV2Factory.sol
    └── IUniswapV2Pair.sol
```
