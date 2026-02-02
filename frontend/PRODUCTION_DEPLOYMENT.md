# Production Deployment Guide 🚀

## Recent Fix: ethers.providers Error

### The Problem
```
TypeError: Cannot read properties of undefined (reading 'Web3Provider')
```

This error occurs in production when ethers is not properly bundled by Vite.

### The Solution

We've implemented **three layers of fixes**:

#### 1. Updated Vite Config
Added ethers to optimization and commonjs handling:

```javascript
// vite.config.js
export default defineConfig({
  build: {
    commonjsOptions: {
      include: [/ethers/, /node_modules/],
      transformMixedEsModules: true,
    },
  },
  optimizeDeps: {
    include: ['ethers'],  // Force ethers to be optimized
  },
});
```

#### 2. Changed Import Strategy
Using namespace import for better bundling:

```typescript
// OLD (can fail in production)
import { ethers } from 'ethers';

// NEW (works in production)
import * as ethers from 'ethers';
```

#### 3. Added Defensive Checks
Added runtime validation:

```typescript
if (!ethers.providers) {
  throw new Error('ethers.providers is not available');
}
```

## Building for Production

### Step 1: Clean Previous Build

```bash
cd frontend
rm -rf dist node_modules/.vite
```

### Step 2: Rebuild

```bash
npm run build
```

### Step 3: Test Production Build Locally

```bash
npm run preview
```

This runs the production build locally so you can test before deploying.

### Step 4: Check for Errors

Open the browser console and verify:
- ✅ No "ethers.providers" errors
- ✅ Wallet connects successfully
- ✅ Tokens load and balances fetch
- ✅ No module resolution errors

## Deployment Checklist

### Before Deploying

- [ ] Clean build: `rm -rf dist node_modules/.vite`
- [ ] Fresh install: `npm ci` (uses package-lock.json)
- [ ] Build: `npm run build`
- [ ] Preview locally: `npm run preview`
- [ ] Test all features:
  - [ ] Wallet connection
  - [ ] Token selection
  - [ ] Balance fetching
  - [ ] Swap calculations
  - [ ] Approve/swap transactions
  - [ ] Impersonator modal

### Environment Variables

Create `.env.production`:

```bash
# Optional: The Graph API key for better rate limits
VITE_GRAPH_API_KEY=your_api_key_here

# Optional: Use mock pools for testing
VITE_USE_MOCK_POOLS=false

# Optional: Custom subgraph URL
VITE_SUBGRAPH_STUDIO_URL=https://api.studio.thegraph.com/query/...
```

### Vercel Deployment

If deploying to Vercel:

1. **Update `vercel.json`**:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "installCommand": "npm ci"
}
```

2. **Add Environment Variables** in Vercel dashboard:
   - `VITE_GRAPH_API_KEY` (if using The Graph)
   - Any other `VITE_*` variables

3. **Deploy**:
```bash
vercel --prod
```

### Netlify Deployment

If deploying to Netlify:

1. **netlify.toml**:
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

2. **Deploy**:
```bash
netlify deploy --prod
```

## Troubleshooting Production Issues

### Issue 1: "ethers.providers is undefined"

**Solutions**:

1. **Clear Vite cache and rebuild**:
   ```bash
   rm -rf node_modules/.vite dist
   npm run build
   ```

2. **Check ethers version**:
   ```bash
   npm list ethers
   ```
   Should show `ethers@5.x` or `ethers@6.x` (we support v5)

3. **Force ethers v5 if needed**:
   ```bash
   npm install ethers@5.7.2 --save-exact
   ```

4. **Check import in production bundle**:
   - Open `dist/assets/*.js`
   - Search for "ethers"
   - Verify it's included

### Issue 2: "Module not found" in production

**Solution**: Add to `vite.config.js`:

```javascript
resolve: {
  alias: {
    'ethers': 'ethers/lib/ethers.js',
  },
},
```

### Issue 3: RainbowKit styles not loading

**Solution**: Ensure CSS is imported before providers:

```jsx
// main.jsx
import '@rainbow-me/rainbowkit/styles.css';  // BEFORE provider
import { Web3Provider } from './providers/Web3Provider';
```

### Issue 4: Wallet connect fails in production

**Solutions**:

1. **Check WalletConnect Project ID**:
   - Get a free ID from https://cloud.walletconnect.com/
   - Update in `Web3Provider.tsx`:
   ```typescript
   const projectId = 'YOUR_PROJECT_ID';
   ```

2. **Check allowed domains** in WalletConnect dashboard

### Issue 5: CORS errors with RPC

**Solution**: Use a reliable RPC provider:

```typescript
// In Web3Provider.tsx, update RPC URLs
transports: {
  [arbitrum.id]: http('https://arb-mainnet.g.alchemy.com/v2/YOUR_KEY'),
  [arbitrumSepolia.id]: http('https://arb-sepolia.g.alchemy.com/v2/YOUR_KEY'),
},
```

## Performance Optimization

### 1. Code Splitting

Split large components:

```jsx
// App.jsx
const SwapComponent = React.lazy(() => import('./components/SwapComponent'));
const LiquidityComponent = React.lazy(() => import('./components/LiquidityComponent'));
```

### 2. Optimize Images

Add to `vite.config.js`:

```javascript
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'vendor': ['react', 'react-dom'],
        'ethers': ['ethers'],
        'wagmi': ['wagmi', '@rainbow-me/rainbowkit'],
      },
    },
  },
},
```

### 3. Enable Compression

For Vercel, add to `vercel.json`:

```json
{
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

## Production Build Analysis

### Analyze Bundle Size

```bash
npm run build -- --mode analyze
```

Check that:
- `ethers` is included in the bundle
- Total bundle size is reasonable (< 500KB for main chunk)
- No duplicate ethers imports

### Check Console Logs

In production, check browser console for:
```
✅ ethers: [object Object]
✅ ethers.providers: [object Object]
✅ Web3Provider available
```

If you see `undefined`, the bundling failed.

## Deployment Platforms

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd frontend
vercel --prod
```

**Environment**: Node 18+ recommended

### Netlify

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
cd frontend
netlify deploy --prod
```

### CloudFlare Pages

```bash
# Build
npm run build

# Upload dist/ folder via dashboard
```

### AWS S3 + CloudFront

```bash
# Build
npm run build

# Upload to S3
aws s3 sync dist/ s3://your-bucket/

# Invalidate CloudFront
aws cloudfront create-invalidation --distribution-id YOUR_ID --paths "/*"
```

## Post-Deployment Verification

After deployment, verify these features work:

1. **Wallet Connection** ✅
   - Open wallet modal
   - Connect wallet
   - Verify address shows correctly

2. **Network Detection** ✅
   - Check correct network badge
   - Try switching networks
   - Verify RainbowKit network switcher works

3. **Token Operations** ✅
   - Select different tokens
   - Check balances load
   - Test swap calculations
   - Verify approve/swap buttons

4. **Impersonator** ✅
   - Click 🎭 button
   - Enter test address
   - Verify read-only mode works

5. **Error Handling** ✅
   - Disconnect wallet → proper message
   - Wrong network → proper error
   - Invalid token → proper validation

## Monitoring

### Sentry Integration (Optional)

```bash
npm install @sentry/react
```

```typescript
// In main.jsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "YOUR_SENTRY_DSN",
  environment: "production",
  tracesSampleRate: 0.1,
});
```

### Console Logging

Key logs to monitor:
```
✅ Wallet connected: 0x...
🔧 SwapComponent Configuration: {...}
✅ Successfully fetched X pairs from...
✅ Pair mapping loaded successfully
```

## Common Production Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `ethers.providers undefined` | Bad bundling | Update vite.config, use `import * as ethers` |
| `Cannot find module 'ethers'` | Missing dependency | `npm ci` to reinstall |
| `ChunkLoadError` | CDN/cache issue | Hard refresh, check CDN |
| `Network request failed` | RPC down | Use fallback RPC |
| `User rejected` | Wallet popup | User-facing, not an error |

## Quick Fix Script

If production build fails, run this:

```bash
#!/bin/bash
cd frontend

# Clean everything
rm -rf dist node_modules/.vite

# Fresh install (uses package-lock.json)
npm ci

# Build with verbose output
npm run build -- --debug

# Test locally
npm run preview
```

## Need Help?

If still having issues:

1. **Check browser console** for detailed errors
2. **Check network tab** for failed requests
3. **Verify ethers is in bundle**:
   ```bash
   grep -r "ethers.providers" dist/assets/*.js
   ```
4. **Compare dev vs prod**:
   - Does it work in `npm run dev`? ✅
   - Does it work in `npm run preview`? ❓
   - If preview works, it's a deployment config issue

---

**Your app should now work perfectly in production! 🎉**

The key fixes were:
1. ✅ Force ethers into Vite optimization
2. ✅ Use namespace import (`import * as ethers`)
3. ✅ Add defensive runtime checks
4. ✅ Enable commonjs transformation

