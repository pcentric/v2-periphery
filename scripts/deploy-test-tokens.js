// Script to deploy test ERC20 tokens and add initial liquidity for testing
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("\n========================================");
  console.log("Deploying Test Tokens with account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());
  console.log("========================================\n");

  // Get deployed router address
  const routerAddress = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
  const factoryAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

  console.log("Using Router:", routerAddress);
  console.log("Using Factory:", factoryAddress);
  console.log();

  // Deploy ERC20 token factory
  const ERC20 = await hre.ethers.getContractFactory("ERC20");

  // Deploy Token A
  console.log("Deploying Token A...");
  const tokenA = await ERC20.deploy(
    hre.ethers.utils.parseEther("1000000") // 1 million tokens
  );
  await tokenA.deployed();
  console.log("✓ Token A deployed to:", tokenA.address);

  // Deploy Token B
  console.log("Deploying Token B...");
  const tokenB = await ERC20.deploy(
    hre.ethers.utils.parseEther("1000000") // 1 million tokens
  );
  await tokenB.deployed();
  console.log("✓ Token B deployed to:", tokenB.address);
  console.log();

  // Get router instance
  const router = await hre.ethers.getContractAt("IUniswapV2Router02", routerAddress);

  // Approve tokens for router
  console.log("Approving tokens for router...");
  const liquidityAmountA = hre.ethers.utils.parseEther("10000"); // 10k tokens
  const liquidityAmountB = hre.ethers.utils.parseEther("10000"); // 10k tokens

  let tx = await tokenA.approve(routerAddress, liquidityAmountA);
  await tx.wait();
  console.log("✓ Token A approved");

  tx = await tokenB.approve(routerAddress, liquidityAmountB);
  await tx.wait();
  console.log("✓ Token B approved");
  console.log();

  // Add initial liquidity
  console.log("Adding initial liquidity...");
  const deadline = Math.floor(Date.now() / 1000) + 1200; // 20 minutes

  tx = await router.addLiquidity(
    tokenA.address,
    tokenB.address,
    liquidityAmountA,
    liquidityAmountB,
    0, // amountAMin
    0, // amountBMin
    deployer.address,
    deadline
  );
  await tx.wait();
  console.log("✓ Initial liquidity added!");
  console.log();

  // Get pair address
  const factory = await hre.ethers.getContractAt("IUniswapV2Factory", factoryAddress);
  const pairAddress = await factory.getPair(tokenA.address, tokenB.address);

  console.log("========================================");
  console.log("DEPLOYMENT COMPLETE!");
  console.log("========================================");
  console.log("\nTest Token Addresses:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Token A:", tokenA.address);
  console.log("Token B:", tokenB.address);
  console.log("Pair:", pairAddress);
  console.log();
  console.log("Initial Liquidity:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Token A:", hre.ethers.utils.formatEther(liquidityAmountA), "tokens");
  console.log("Token B:", hre.ethers.utils.formatEther(liquidityAmountB), "tokens");
  console.log();
  console.log("========================================");
  console.log("COPY THESE ADDRESSES TO YOUR FRONTEND!");
  console.log("========================================");
  console.log("\nYou can now use these addresses in the swap interface.");
  console.log();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
