/**
 * React Query hook for fetching all Uniswap V2 tokens from The Graph subgraph
 * Uses Arbitrum Uniswap V2 subgraph for real-time token data
 * Fetches tokens ordered by total value locked (TVL)
 */

import { useQuery } from "@tanstack/react-query";
import { Token } from "../lib/graphql/uniswapV2Subgraph";
import { fetchArbTokensFromList } from "../utils/tokenListApi";

interface UseV2AllTokensOptions {
  network?: string;
  enabled?: boolean;
}

interface UseV2AllTokensResult {
  tokens: Token[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Hook to fetch all tokens from Uniswap V2 subgraph
 * Caches results for 1 hour
 */
export function useV2AllTokens({
  network = "arbitrum",
  enabled = true,
}: UseV2AllTokensOptions = {}): UseV2AllTokensResult {
  const {
    data = [],
    error,
    isError,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["uniswapV2AllTokens", network],
    queryFn: async () => {
      const tokens = await fetchArbTokensFromList();
      // Tokens already have 'id' field from subgraph mapping
      return tokens;
    },
    enabled,
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 2, // 2 hours
    retry: 2,
    retryDelay: (attemptIndex) =>
      Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  console.log(`Loaded ${data.length} tokens from Uniswap V2 subgraph`, data as Token[], "error", error);
  return {
    tokens: data,
    isLoading,
    isError,
    error: error as Error | null,
    refetch: () => refetch(),
  };
}

export default useV2AllTokens;
