#!/usr/bin/env node

/**
 * Extract Essential ABIs for Frontend Integration
 *
 * This script extracts only the necessary ABIs from the build directories
 * and creates a clean frontend-ready package.
 */

const fs = require('fs');
const path = require('path');

// Output directory for frontend ABIs
const OUTPUT_DIR = path.join(__dirname, 'frontend-abis');

// Essential contracts from v2-periphery (build/)
const PERIPHERY_CONTRACTS = [
  'UniswapV2Router02',
  'IUniswapV2Router02',
  'IUniswapV2Router01',
  'UniswapV2Migrator',
  'IERC20',
  'IWETH',
  'WETH9',
  'UniswapV2Library',
  'UniswapV2OracleLibrary',
  'UniswapV2LiquidityMathLibrary',
  'ExampleFlashSwap',
  'ExampleSlidingWindowOracle',
  'ExampleOracleSimple',
  'ExampleSwapToPrice',
  'ExampleComputeLiquidityValue'
];

// Essential contracts from v2-core
const CORE_CONTRACTS = [
  'UniswapV2Factory',
  'UniswapV2Pair',
  'IUniswapV2Factory',
  'IUniswapV2Pair',
  'IUniswapV2ERC20'
];

/**
 * Extract ABI from contract JSON
 */
function extractABI(contractPath) {
  try {
    const content = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
    return content.abi;
  } catch (error) {
    console.error(`Error reading ${contractPath}:`, error.message);
    return null;
  }
}

/**
 * Create clean ABI export
 */
function createABIExport(contractName, abi, bytecode = null) {
  const output = {
    contractName,
    abi
  };

  if (bytecode) {
    output.bytecode = bytecode;
  }

  return output;
}

/**
 * Main extraction function
 */
function extractABIs() {
  console.log('🚀 Extracting Frontend ABIs...\n');

  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Create subdirectories
  const peripheryDir = path.join(OUTPUT_DIR, 'periphery');
  const coreDir = path.join(OUTPUT_DIR, 'core');

  if (!fs.existsSync(peripheryDir)) fs.mkdirSync(peripheryDir);
  if (!fs.existsSync(coreDir)) fs.mkdirSync(coreDir);

  let successCount = 0;
  let errorCount = 0;

  // Extract periphery contracts
  console.log('📦 Extracting Periphery Contracts...');
  PERIPHERY_CONTRACTS.forEach(contractName => {
    const contractPath = path.join(__dirname, 'build', `${contractName}.json`);

    if (fs.existsSync(contractPath)) {
      try {
        const contractJson = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
        const output = createABIExport(
          contractName,
          contractJson.abi,
          contractJson.bytecode
        );

        const outputPath = path.join(peripheryDir, `${contractName}.json`);
        fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
        console.log(`  ✓ ${contractName}`);
        successCount++;
      } catch (error) {
        console.error(`  ✗ ${contractName}:`, error.message);
        errorCount++;
      }
    } else {
      console.log(`  ⚠ ${contractName} not found`);
    }
  });

  // Extract core contracts
  console.log('\n📦 Extracting Core Contracts...');
  CORE_CONTRACTS.forEach(contractName => {
    const contractPath = path.join(
      __dirname,
      'node_modules/@uniswap/v2-core/build',
      `${contractName}.json`
    );

    if (fs.existsSync(contractPath)) {
      try {
        const contractJson = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
        const output = createABIExport(
          contractName,
          contractJson.abi,
          contractJson.bytecode
        );

        const outputPath = path.join(coreDir, `${contractName}.json`);
        fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
        console.log(`  ✓ ${contractName}`);
        successCount++;
      } catch (error) {
        console.error(`  ✗ ${contractName}:`, error.message);
        errorCount++;
      }
    } else {
      console.log(`  ⚠ ${contractName} not found`);
    }
  });

  // Create index file for easy imports
  console.log('\n📝 Creating index files...');

  // Periphery index
  const peripheryIndex = PERIPHERY_CONTRACTS
    .map(name => `export { default as ${name} } from './${name}.json';`)
    .join('\n');
  fs.writeFileSync(path.join(peripheryDir, 'index.js'), peripheryIndex);

  // Core index
  const coreIndex = CORE_CONTRACTS
    .map(name => `export { default as ${name} } from './${name}.json';`)
    .join('\n');
  fs.writeFileSync(path.join(coreDir, 'index.js'), coreIndex);

  // Main index
  const mainIndex = `export * as Periphery from './periphery/index.js';
export * as Core from './core/index.js';

// Quick access to most commonly used contracts
export { default as UniswapV2Router02 } from './periphery/UniswapV2Router02.json';
export { default as IUniswapV2Router02 } from './periphery/IUniswapV2Router02.json';
export { default as UniswapV2Factory } from './core/UniswapV2Factory.json';
export { default as IUniswapV2Factory } from './core/IUniswapV2Factory.json';
export { default as IUniswapV2Pair } from './core/IUniswapV2Pair.json';
export { default as IERC20 } from './periphery/IERC20.json';
export { default as IWETH } from './periphery/IWETH.json';
`;
  fs.writeFileSync(path.join(OUTPUT_DIR, 'index.js'), mainIndex);

  // Create TypeScript declarations
  const tsDeclarations = `declare module '*/frontend-abis' {
  export interface ContractABI {
    contractName: string;
    abi: any[];
    bytecode?: string;
  }

  export namespace Periphery {
    export const UniswapV2Router02: ContractABI;
    export const IUniswapV2Router02: ContractABI;
    export const IERC20: ContractABI;
    export const IWETH: ContractABI;
    export const WETH9: ContractABI;
  }

  export namespace Core {
    export const UniswapV2Factory: ContractABI;
    export const UniswapV2Pair: ContractABI;
    export const IUniswapV2Factory: ContractABI;
    export const IUniswapV2Pair: ContractABI;
  }

  export const UniswapV2Router02: ContractABI;
  export const IUniswapV2Router02: ContractABI;
  export const UniswapV2Factory: ContractABI;
  export const IUniswapV2Factory: ContractABI;
  export const IUniswapV2Pair: ContractABI;
  export const IERC20: ContractABI;
  export const IWETH: ContractABI;
}
`;
  fs.writeFileSync(path.join(OUTPUT_DIR, 'index.d.ts'), tsDeclarations);

  // Create package.json for the ABIs
  const packageJson = {
    name: '@uniswap/v2-periphery-abis',
    version: '1.0.0',
    description: 'Frontend-ready ABIs for Uniswap V2 Periphery',
    main: 'index.js',
    types: 'index.d.ts',
    files: [
      'periphery',
      'core',
      'index.js',
      'index.d.ts'
    ],
    keywords: ['uniswap', 'v2', 'abi', 'ethereum', 'defi'],
    license: 'GPL-3.0-or-later'
  };
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );

  // Create README for frontend-abis
  const readme = `# Uniswap V2 Periphery - Frontend ABIs

This package contains all the necessary ABIs for integrating Uniswap V2 into your frontend.

## Installation

Copy this \`frontend-abis\` folder to your frontend project.

## Usage

### JavaScript/Node.js
\`\`\`javascript
import { UniswapV2Router02, IUniswapV2Factory, IERC20 } from './frontend-abis'

console.log(UniswapV2Router02.abi)
\`\`\`

### TypeScript
\`\`\`typescript
import { UniswapV2Router02, IUniswapV2Pair } from './frontend-abis'
import { ethers } from 'ethers'

const router = new ethers.Contract(
  routerAddress,
  UniswapV2Router02.abi,
  signer
)
\`\`\`

## Structure

- \`periphery/\` - Router, WETH, and periphery contracts
- \`core/\` - Factory and Pair contracts
- \`index.js\` - Main exports
- \`index.d.ts\` - TypeScript declarations

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
`;
  fs.writeFileSync(path.join(OUTPUT_DIR, 'README.md'), readme);

  // Summary
  console.log('\n✨ Extraction Complete!\n');
  console.log(`📊 Summary:`);
  console.log(`   Success: ${successCount} contracts`);
  console.log(`   Errors: ${errorCount} contracts`);
  console.log(`\n📁 Output: ${OUTPUT_DIR}/`);
  console.log('\n📖 Next steps:');
  console.log('   1. Copy frontend-abis/ to your frontend project');
  console.log('   2. Import ABIs: import { UniswapV2Router02 } from "./frontend-abis"');
  console.log('   3. Use in your app with ethers.js or web3.js');
  console.log('\n💡 See FRONTEND_INTEGRATION_GUIDE.md for usage examples');
}

// Run extraction
if (require.main === module) {
  extractABIs();
}

module.exports = { extractABIs };
