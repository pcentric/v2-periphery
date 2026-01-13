# Troubleshooting Guide

## Common Errors and Solutions

### 1. "Invalid token address or contract not found"

**Error Message:**
```
Failed to check approval: Error: call revert exception
method="allowance(address,address)", data="0x"
```

**Cause:** You entered a token address that doesn't exist or isn't a valid ERC20 contract.

**Solutions:**

#### Option A: Deploy Test Tokens

Run the test token deployment script:

```bash
# Make sure Hardhat node is running first
npx hardhat node

# In another terminal
npx hardhat run scripts/deploy-test-tokens.js --network localhost
```

This will:
- Deploy two test ERC20 tokens
- Add initial liquidity (10,000 tokens each)
- Display the token addresses to use in the UI

#### Option B: Use WETH

You can also test with the deployed WETH contract:
- WETH Address: `0x5FbDB2315678afecb367f032d93F642f64180aa3`

To get WETH:
```javascript
// In Hardhat console
const weth = await ethers.getContractAt("IWETH", "0x5FbDB2315678afecb367f032d93F642f64180aa3");
await weth.deposit({ value: ethers.utils.parseEther("10") });
```

---

### 2. "Not a valid ERC20 token contract"

**Cause:** The address points to a contract that doesn't implement the ERC20 interface.

**Solution:** Make sure you're using the correct token contract addresses from the deployment script output.

---

### 3. "Please switch to hardhat network"

**Cause:** MetaMask is connected to the wrong network.

**Solution:**

1. Open MetaMask
2. Click the network dropdown
3. Select "Hardhat Local" (or add it if not present):
   - Network Name: `Hardhat Local`
   - RPC URL: `http://127.0.0.1:8545`
   - Chain ID: `31337`
   - Currency: `ETH`

---

### 4. "Insufficient Liquidity"

**Cause:** The trading pair doesn't have liquidity or doesn't exist.

**Solution:**

1. Make sure you've deployed test tokens using the script
2. Check that initial liquidity was added
3. Or add liquidity manually using the "Liquidity" tab:
   - Enter both token addresses
   - Enter amounts for both tokens
   - Approve both tokens
   - Click "Add Liquidity"

---

### 5. Token Input is Disabled

**Cause:** The token address validation failed.

**Solution:**

1. Make sure you entered a valid Ethereum address (starts with `0x` and is 42 characters)
2. Verify the contract exists at that address
3. Wait for the validation check to complete (you'll see "Validating...")
4. If you see a green checkmark (✓) with the token symbol, it's valid

---

### 6. "Transaction Failed" or "Execution Reverted"

**Common Causes:**

#### A. Insufficient Balance
- Check you have enough tokens to swap
- Check you have enough ETH for gas fees

#### B. Slippage Too Low
- The price moved more than your slippage tolerance
- **Solution:** Increase slippage tolerance using the slider (try 1-2%)

#### C. Token Not Approved
- Make sure you clicked "Approve" and the transaction was confirmed
- Wait for the approval transaction to be mined

#### D. Deadline Exceeded
- Transaction took too long to be mined
- **Solution:** Retry the transaction

---

### 7. Approval Transaction Keeps Failing

**Solutions:**

1. **Check Token Balance:** Make sure you have tokens to approve
2. **Reset MetaMask:** Settings → Advanced → Reset Account
3. **Check Gas:** Make sure you have enough ETH for gas
4. **Try Smaller Amount:** Approve a specific amount instead of max

---

### 8. "Connect Wallet" Button Not Working

**Causes & Solutions:**

#### MetaMask Not Installed
- Install [MetaMask](https://metamask.io/) browser extension

#### Wrong Network
- Make sure you're on the Hardhat Local network (Chain ID: 31337)

#### MetaMask Locked
- Unlock MetaMask and try again

#### Browser Issues
- Refresh the page
- Try a different browser
- Clear browser cache

---

### 9. "Price Impact Too High"

**Cause:** Your trade is too large relative to the liquidity pool.

**Solutions:**

1. **Reduce Trade Size:** Trade a smaller amount
2. **Add More Liquidity:** Add liquidity to the pool first
3. **Split Trade:** Execute multiple smaller trades
4. **Increase Slippage:** Only if you understand the implications

---

### 10. Frontend Not Loading/Blank Page

**Solutions:**

1. **Check Console:** Open browser console (F12) for errors
2. **Rebuild:**
   ```bash
   cd frontend
   rm -rf node_modules dist
   npm install
   npm run dev
   ```
3. **Check Node Version:** Requires Node.js v16+
   ```bash
   node --version
   ```

---

### 11. "Failed to Fetch Reserves"

**Cause:** The pair doesn't exist yet.

**Solution:**

1. Deploy test tokens with the script (includes liquidity)
2. Or manually create a pair by adding liquidity:
   - Go to "Liquidity" tab
   - Enter both token addresses
   - Add liquidity for both tokens

---

### 12. MetaMask Shows Different Balance Than Expected

**Solutions:**

1. **Refresh Balance:** Close and reopen MetaMask
2. **Check Token:** Make sure you're looking at the right token
3. **Add Token to MetaMask:**
   - Click "Import Tokens" in MetaMask
   - Paste the token address
   - Token should appear with balance

---

## Development Tips

### Reset Everything

If things get really messed up:

```bash
# 1. Stop Hardhat node (Ctrl+C)

# 2. Restart Hardhat node
npx hardhat node

# 3. Redeploy contracts
npx hardhat run scripts/deploy.js --network localhost

# 4. Deploy test tokens
npx hardhat run scripts/deploy-test-tokens.js --network localhost

# 5. Reset MetaMask account
# MetaMask → Settings → Advanced → Reset Account

# 6. Restart frontend
cd frontend
npm run dev
```

### Enable Debug Mode

Add this to your browser console for detailed logs:

```javascript
localStorage.setItem('debug', 'true');
```

### Check Contract State

Use Hardhat console to inspect contracts:

```bash
npx hardhat console --network localhost
```

```javascript
// Get router
const router = await ethers.getContractAt("IUniswapV2Router02", "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0");

// Check factory
const factory = await router.factory();
console.log("Factory:", factory);

// Check WETH
const weth = await router.WETH();
console.log("WETH:", weth);
```

---

## Getting Help

If you're still stuck:

1. **Check the browser console** (F12) for detailed error messages
2. **Check the Hardhat node terminal** for contract errors
3. **Review the [Frontend README](README.md)** for setup instructions
4. **Review the [Integration Guide](../FRONTEND_INTEGRATION_GUIDE.md)** for contract details

---

## Quick Reference

### Deployed Contract Addresses (Hardhat Local)

| Contract | Address |
|----------|---------|
| WETH | `0x5FbDB2315678afecb367f032d93F642f64180aa3` |
| Factory | `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512` |
| Router | `0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0` |

### Network Configuration

- **Network Name:** Hardhat Local
- **RPC URL:** `http://127.0.0.1:8545`
- **Chain ID:** `31337`
- **Currency:** ETH

### Useful Commands

```bash
# Start Hardhat node
npx hardhat node

# Deploy contracts
npx hardhat run scripts/deploy.js --network localhost

# Deploy test tokens
npx hardhat run scripts/deploy-test-tokens.js --network localhost

# Start frontend
cd frontend && npm run dev

# Rebuild frontend
cd frontend && npm run build
```
