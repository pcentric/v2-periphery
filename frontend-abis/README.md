# Uniswap V2 Periphery - Frontend ABIs

This package contains all the necessary ABIs for integrating Uniswap V2 into your frontend.

## Installation

Copy this `frontend-abis` folder to your frontend project.

## Usage

### JavaScript/Node.js
```javascript
import { UniswapV2Router02, IUniswapV2Factory, IERC20 } from './frontend-abis'

console.log(UniswapV2Router02.abi)
```

### TypeScript
```typescript
import { UniswapV2Router02, IUniswapV2Pair } from './frontend-abis'
import { ethers } from 'ethers'

const router = new ethers.Contract(
  routerAddress,
  UniswapV2Router02.abi,
  signer
)
```

## Structure

- `periphery/` - Router, WETH, and periphery contracts
- `core/` - Factory and Pair contracts
- `index.js` - Main exports
- `index.d.ts` - TypeScript declarations

## Contracts Included

### Periphery
- UniswapV2Router02 (Main router)
- IUniswapV2Router02 (Router interface)
- IERC20, IWETH, WETH9 (Token interfaces)
- Library contracts for calculations
- Example contracts for advanced features

### Core
- UniswapV2Factory (Creates pairs)
- UniswapV2Pair (Liquidity pool)
- Interfaces for Factory and Pair

## File Sizes

Total package size: ~150KB (all ABIs included)

Critical ABIs only (~50KB):
- UniswapV2Router02
- IUniswapV2Factory
- IUniswapV2Pair
- IERC20
- IWETH

## License

GPL-3.0-or-later
