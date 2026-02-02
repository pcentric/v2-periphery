import React from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { config } from '../config/wagmi';
import '@rainbow-me/rainbowkit/styles.css';

// Create QueryClient instance (should be created outside component to avoid re-creation)
const queryClient = new QueryClient();

// Custom dark theme matching Uniswap colors
const customTheme = darkTheme({
  accentColor: '#FF007A', // Pink primary (matches --pink-primary)
  accentColorForeground: 'white',
  borderRadius: 'medium', // 16px to match app's border-radius
  fontStack: 'system',
  overlayBlur: 'small',
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={customTheme}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
