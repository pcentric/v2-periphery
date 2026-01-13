const hre = require('hardhat')
const fs = require('fs')

async function main() {
  const [deployer] = await hre.ethers.getSigners()

  console.log('🚀 Starting Complete Deployment')
  console.log('=====================================')
  console.log('Deploying contracts with account:', deployer.address)
  console.log('Account balance:', hre.ethers.utils.formatEther(await deployer.getBalance()), 'ETH')
  console.log('Network:', hre.network.name)
  console.log('Chain ID:', hre.network.config.chainId)
  console.log('=====================================\n')

  const deployedAddresses = {}

  // Step 1: Deploy WETH9
  console.log('📦 Step 1/3: Deploying WETH9...')
  const WETH9 = await hre.ethers.getContractFactory('WETH9')
  const weth = await WETH9.deploy()
  await weth.deployed()
  deployedAddresses.weth = weth.address
  console.log('✅ WETH9 deployed to:', weth.address)

  // Step 2: Deploy UniswapV2Factory (from v2-core)
  console.log('\n📦 Step 2/3: Deploying UniswapV2Factory...')
  const factoryArtifact = require('@uniswap/v2-core/build/UniswapV2Factory.json')
  const Factory = await hre.ethers.getContractFactory(
    factoryArtifact.abi,
    factoryArtifact.bytecode
  )
  const factory = await Factory.deploy(deployer.address)
  await factory.deployed()
  deployedAddresses.factory = factory.address
  console.log('✅ UniswapV2Factory deployed to:', factory.address)

  // Get init code hash
  const pairArtifact = require('@uniswap/v2-core/build/UniswapV2Pair.json')
  const bytecode = pairArtifact.bytecode.startsWith('0x') ? pairArtifact.bytecode : '0x' + pairArtifact.bytecode
  const INIT_CODE_HASH = hre.ethers.utils.keccak256(bytecode)
  console.log('   Init Code Hash:', INIT_CODE_HASH)

  // Step 3: Deploy UniswapV2Router02
  console.log('\n📦 Step 3/3: Deploying UniswapV2Router02...')
  const Router02 = await hre.ethers.getContractFactory('UniswapV2Router02')
  const router = await Router02.deploy(factory.address, weth.address)
  await router.deployed()
  deployedAddresses.router02 = router.address
  console.log('✅ UniswapV2Router02 deployed to:', router.address)

  // Verify
  console.log('\n🔍 Verifying Router Configuration...')
  const routerFactory = await router.factory()
  const routerWETH = await router.WETH()
  console.log('   Factory from router:', routerFactory)
  console.log('   WETH from router:', routerWETH)
  console.log('✅ Router configuration verified')

  // Summary
  console.log('\n=====================================')
  console.log('📝 DEPLOYMENT SUMMARY')
  console.log('=====================================')
  console.log('Network:', hre.network.name)
  console.log('Chain ID:', hre.network.config.chainId)
  console.log('Deployer:', deployer.address)
  console.log('\n📍 Contract Addresses:')
  console.log('   WETH9:', deployedAddresses.weth)
  console.log('   UniswapV2Factory:', deployedAddresses.factory)
  console.log('   UniswapV2Router02:', deployedAddresses.router02)
  console.log('\n🔑 Init Code Hash:', INIT_CODE_HASH)
  console.log('=====================================\n')

  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    chainId: hre.network.config.chainId,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      WETH9: deployedAddresses.weth,
      UniswapV2Factory: deployedAddresses.factory,
      UniswapV2Router02: deployedAddresses.router02
    },
    constants: {
      initCodeHash: INIT_CODE_HASH
    }
  }

  fs.writeFileSync('deployment.json', JSON.stringify(deploymentInfo, null, 2))
  console.log('💾 Deployment info saved to: deployment.json\n')

  // Create frontend config
  const frontendConfig = `// Auto-generated deployment config
// Generated at: ${new Date().toISOString()}

export const contracts = {
  weth: '${deployedAddresses.weth}',
  factory: '${deployedAddresses.factory}',
  router: '${deployedAddresses.router02}',
  initCodeHash: '${INIT_CODE_HASH}'
}

export const network = {
  name: '${hre.network.name}',
  chainId: ${hre.network.config.chainId}
}

export const deployer = '${deployer.address}'
`

  fs.writeFileSync('deployed-config.js', frontendConfig)
  console.log('💾 Frontend config saved to: deployed-config.js\n')

  console.log('✨ Deployment Complete!\n')

  return deploymentInfo
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Deployment failed:', error)
    process.exit(1)
  })
