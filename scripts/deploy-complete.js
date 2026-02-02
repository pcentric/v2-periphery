// Complete deployment script - deploys all contracts, test tokens, and adds liquidity
const hre = require("hardhat");
const fs = require("fs");

async function main() {
  const [deployer, user1, user2] = await hre.ethers.getSigners();

  console.log("\n🚀 COMPLETE UNISWAP V2 DEPLOYMENT");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("Network:", hre.network.name);
  console.log("Chain ID:", hre.network.config.chainId);
  console.log("Deployer:", deployer.address);
  console.log(
    "Balance:",
    hre.ethers.utils.formatEther(await deployer.getBalance()),
    "ETH"
  );
  console.log("═══════════════════════════════════════════════════════════════\n");

  const deployed = {};

  // ══════════════════════════════════════════════════════════════════════════
  // STEP 1: Deploy Core Contracts
  // ══════════════════════════════════════════════════════════════════════════
  console.log("📦 STEP 1: Deploying Core Contracts...\n");

  // Deploy WETH9
  console.log("  [1/3] Deploying WETH9...");
  const WETH9 = await hre.ethers.getContractFactory("WETH9");
  const weth = await WETH9.deploy();
  await weth.deployed();
  deployed.weth = weth.address;
  console.log("       ✅ WETH9:", weth.address);

  // Deploy UniswapV2Factory
  console.log("  [2/3] Deploying UniswapV2Factory...");
  const factoryArtifact = require("@uniswap/v2-core/build/UniswapV2Factory.json");
  const Factory = await hre.ethers.getContractFactory(
    factoryArtifact.abi,
    factoryArtifact.bytecode
  );
  const factory = await Factory.deploy(deployer.address);
  await factory.deployed();
  deployed.factory = factory.address;
  console.log("       ✅ Factory:", factory.address);

  // Get init code hash
  const pairArtifact = require("@uniswap/v2-core/build/UniswapV2Pair.json");
  const bytecode = pairArtifact.bytecode.startsWith("0x")
    ? pairArtifact.bytecode
    : "0x" + pairArtifact.bytecode;
  const INIT_CODE_HASH = hre.ethers.utils.keccak256(bytecode);
  deployed.initCodeHash = INIT_CODE_HASH;
  console.log("       📝 Init Code Hash:", INIT_CODE_HASH);

  // Deploy UniswapV2Router02
  console.log("  [3/3] Deploying UniswapV2Router02...");
  const Router02 = await hre.ethers.getContractFactory("UniswapV2Router02");
  const router = await Router02.deploy(factory.address, weth.address);
  await router.deployed();
  deployed.router = router.address;
  console.log("       ✅ Router:", router.address);

  // Verify router configuration
  const routerFactory = await router.factory();
  const routerWETH = await router.WETH();
  console.log("\n  🔍 Verification:");
  console.log("       Router.factory():", routerFactory);
  console.log("       Router.WETH():", routerWETH);
  console.log(
    "       ✅ Configuration verified:",
    routerFactory === factory.address && routerWETH === weth.address
  );

  // ══════════════════════════════════════════════════════════════════════════
  // STEP 2: Deploy Test Tokens
  // ══════════════════════════════════════════════════════════════════════════
  console.log("\n📦 STEP 2: Deploying Test Tokens...\n");

  const ERC20 = await hre.ethers.getContractFactory("ERC20");
  const initialSupply = hre.ethers.utils.parseEther("1000000"); // 1M tokens each

  console.log("  [1/2] Deploying Token A (TKA)...");
  const tokenA = await ERC20.deploy(initialSupply);
  await tokenA.deployed();
  deployed.tokenA = tokenA.address;
  console.log("       ✅ Token A:", tokenA.address);

  console.log("  [2/2] Deploying Token B (TKB)...");
  const tokenB = await ERC20.deploy(initialSupply);
  await tokenB.deployed();
  deployed.tokenB = tokenB.address;
  console.log("       ✅ Token B:", tokenB.address);

  // ══════════════════════════════════════════════════════════════════════════
  // STEP 3: Add Initial Liquidity
  // ══════════════════════════════════════════════════════════════════════════
  console.log("\n📦 STEP 3: Adding Initial Liquidity...\n");

  const liquidityAmount = hre.ethers.utils.parseEther("100000"); // 100k each token
  const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour

  console.log("  Approving tokens for router...");
  await (await tokenA.approve(router.address, liquidityAmount)).wait();
  await (await tokenB.approve(router.address, liquidityAmount)).wait();
  console.log("       ✅ Tokens approved");

  console.log("  Adding liquidity to TokenA/TokenB pair...");
  await (
    await router.addLiquidity(
      tokenA.address,
      tokenB.address,
      liquidityAmount,
      liquidityAmount,
      0,
      0,
      deployer.address,
      deadline
    )
  ).wait();

  const pairAddress = await factory.getPair(tokenA.address, tokenB.address);
  deployed.pair = pairAddress;
  console.log("       ✅ Liquidity added!");
  console.log("       📝 Pair address:", pairAddress);

  // Also add ETH liquidity (WETH/TokenA)
  console.log("\n  Adding liquidity to WETH/TokenA pair...");
  const ethLiquidity = hre.ethers.utils.parseEther("10"); // 10 ETH
  const tokenLiquidity = hre.ethers.utils.parseEther("10000"); // 10k tokens

  await (await tokenA.approve(router.address, tokenLiquidity)).wait();
  await (
    await router.addLiquidityETH(
      tokenA.address,
      tokenLiquidity,
      0,
      0,
      deployer.address,
      deadline,
      { value: ethLiquidity }
    )
  ).wait();

  const wethPairAddress = await factory.getPair(weth.address, tokenA.address);
  deployed.wethPair = wethPairAddress;
  console.log("       ✅ ETH liquidity added!");
  console.log("       📝 WETH/TokenA pair:", wethPairAddress);

  // ══════════════════════════════════════════════════════════════════════════
  // STEP 4: Fund Test Accounts with Tokens
  // ══════════════════════════════════════════════════════════════════════════
  console.log("\n📦 STEP 4: Funding Test Accounts...\n");

  const tokenFundAmount = hre.ethers.utils.parseEther("10000"); // 10k tokens each

  // Fund user1 if available (Hardhat gives us multiple accounts)
  if (user1) {
    console.log("  Funding User 1:", user1.address);
    await (await tokenA.transfer(user1.address, tokenFundAmount)).wait();
    await (await tokenB.transfer(user1.address, tokenFundAmount)).wait();
    console.log("       ✅ Sent 10,000 TKA + 10,000 TKB");
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SAVE DEPLOYMENT INFO
  // ══════════════════════════════════════════════════════════════════════════

  const deploymentInfo = {
    network: hre.network.name,
    chainId: hre.network.config.chainId,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      WETH9: deployed.weth,
      UniswapV2Factory: deployed.factory,
      UniswapV2Router02: deployed.router,
    },
    testTokens: {
      TokenA: deployed.tokenA,
      TokenB: deployed.tokenB,
    },
    pairs: {
      "TokenA-TokenB": deployed.pair,
      "WETH-TokenA": deployed.wethPair,
    },
    constants: {
      initCodeHash: deployed.initCodeHash,
    },
  };

  fs.writeFileSync("deployment.json", JSON.stringify(deploymentInfo, null, 2));

  // Update frontend config
  const frontendConfig = `// Import ABIs from the frontend-abis package
import UniswapV2Router02ABI from '../../../frontend-abis/periphery/UniswapV2Router02.json';
import IUniswapV2FactoryABI from '../../../frontend-abis/core/IUniswapV2Factory.json';
import IUniswapV2PairABI from '../../../frontend-abis/core/IUniswapV2Pair.json';
import IERC20ABI from '../../../frontend-abis/periphery/IERC20.json';
import IWETHABI from '../../../frontend-abis/periphery/IWETH.json';

// Deployed contract addresses (auto-generated)
// Generated at: ${new Date().toISOString()}
export const CONTRACT_ADDRESSES = {
  WETH: '${deployed.weth}',
  FACTORY: '${deployed.factory}',
  ROUTER: '${deployed.router}'
};

// Test token addresses (for local testing)
export const TEST_TOKENS = {
  TOKEN_A: '${deployed.tokenA}',
  TOKEN_B: '${deployed.tokenB}',
  PAIR_AB: '${deployed.pair}',
  PAIR_WETH_A: '${deployed.wethPair}'
};

// Network configuration
export const NETWORK_CONFIG = {
  name: '${hre.network.name}',
  chainId: ${hre.network.config.chainId},
  rpcUrl: 'http://127.0.0.1:8545'
};

// Contract ABIs
export const CONTRACT_ABIS = {
  ROUTER: UniswapV2Router02ABI.abi,
  FACTORY: IUniswapV2FactoryABI.abi,
  PAIR: IUniswapV2PairABI.abi,
  ERC20: IERC20ABI.abi,
  WETH: IWETHABI.abi
};

// Pair init code hash (needed for computing pair addresses)
export const INIT_CODE_HASH = '${deployed.initCodeHash}';

// Gas limits for different operations
export const GAS_LIMITS = {
  SWAP: 200000,
  ADD_LIQUIDITY: 300000,
  REMOVE_LIQUIDITY: 300000,
  APPROVE: 100000
};

// Slippage tolerance (in basis points, 50 = 0.5%)
export const DEFAULT_SLIPPAGE = 50;

// Transaction deadline (in seconds from now)
export const DEFAULT_DEADLINE = 1200; // 20 minutes
`;

  fs.writeFileSync("frontend/src/config/contracts.js", frontendConfig);

  // ══════════════════════════════════════════════════════════════════════════
  // FINAL SUMMARY
  // ══════════════════════════════════════════════════════════════════════════
  console.log("\n");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("🎉 DEPLOYMENT COMPLETE!");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("\n📍 CORE CONTRACTS:");
  console.log("   WETH9:              ", deployed.weth);
  console.log("   UniswapV2Factory:   ", deployed.factory);
  console.log("   UniswapV2Router02:  ", deployed.router);
  console.log("\n🪙 TEST TOKENS:");
  console.log("   Token A (TKA):      ", deployed.tokenA);
  console.log("   Token B (TKB):      ", deployed.tokenB);
  console.log("\n💧 LIQUIDITY PAIRS:");
  console.log("   TokenA/TokenB Pair: ", deployed.pair);
  console.log("   WETH/TokenA Pair:   ", deployed.wethPair);
  console.log("\n🔑 INIT CODE HASH:");
  console.log("  ", deployed.initCodeHash);
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("📋 HOW TO USE IN METAMASK:");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("\n1. Add Hardhat Network to MetaMask:");
  console.log("   Network Name: Hardhat Local");
  console.log("   RPC URL: http://127.0.0.1:8545");
  console.log("   Chain ID: 31337");
  console.log("   Currency: ETH");
  console.log("\n2. Import a test account (has 10,000 ETH):");
  console.log("   Account: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");
  console.log("   Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80");
  console.log("\n3. Add Test Tokens to MetaMask:");
  console.log("   Token A:", deployed.tokenA);
  console.log("   Token B:", deployed.tokenB);
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("💾 Files updated:");
  console.log("   - deployment.json");
  console.log("   - frontend/src/config/contracts.js");
  console.log("═══════════════════════════════════════════════════════════════\n");

  return deploymentInfo;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });




