/**
 * Uniswap V2 Subgraph Token Fetching - Fetch tokens from The Graph subgraph
 * Uses Arbitrum Uniswap V2 subgraph for real-time token data
 */

import { Token } from "../lib/graphql/uniswapV2Subgraph";
// @ts-ignore - JS config file
import { SUBGRAPH_URL, GRAPHQL_QUERIES } from "../config/uniswapV2.js";

/**
 * Fetch all tokens from subgraph with pagination
 */
async function fetchTokensFromSubgraph(first: number = 1000, skip: number = 0): Promise<any[]> {
  try {
    const response = await fetch(SUBGRAPH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: GRAPHQL_QUERIES.TOKENS,
        variables: { first, skip },
      }),
    });

    if (!response.ok) {
      throw new Error(`Subgraph error: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.errors) {
      console.error('GraphQL errors:', data.errors);
      throw new Error('Failed to fetch tokens from subgraph');
    }

    return data.data.tokens || [];
  } catch (error) {
    console.error('Subgraph fetch error:', error);
    throw error;
  }
}

/**
 * Fetch all Arbitrum tokens from Uniswap V2 subgraph
 * Fetches all pages of tokens (up to 5000 total)
 */
export async function fetchArbTokensFromList(): Promise<Token[]> {
  try {
    const allTokens: any[] = [];
    const pageSize = 1000;
    const maxPages = 5; // Fetch up to 5000 tokens

    // Fetch multiple pages
    for (let page = 0; page < maxPages; page++) {
      const tokens = await fetchTokensFromSubgraph(pageSize, page * pageSize);
      
      if (tokens.length === 0) {
        break; // No more tokens to fetch
      }
      
      allTokens.push(...tokens);
      
      if (tokens.length < pageSize) {
        break; // Last page
      }
    }

    // Convert subgraph format to Token format
    const formattedTokens: Token[] = allTokens.map((token) => ({
      chainId: 42161, // Arbitrum
      address: token.id,
      symbol: token.symbol,
      name: token.name,
      decimals: parseInt(token.decimals),
      id: token.id.toLowerCase(),
      volumeUSD: token.volumeUSD,
      txCount: token.txCount,
    }));

    console.log(`Loaded ${formattedTokens.length} Arbitrum tokens from subgraph`);
    return formattedTokens;
  } catch (error) {
    console.error("Failed to fetch tokens from subgraph:", error);
    throw error;
  }
}

/**
 * Search tokens by symbol, name, or address (client-side)
 * Instant search without API calls
 */
export function searchTokens(tokens: Token[], query: string): Token[] {
  if (!query || query.trim().length === 0) {
    return tokens;
  }

  const lowerQuery = query.toLowerCase().trim();

  return tokens.filter(token =>
    token.symbol.toLowerCase().includes(lowerQuery) ||
    token.name.toLowerCase().includes(lowerQuery) ||
    (token.address && token.address.toLowerCase() === lowerQuery) ||
    (token.id && token.id.toLowerCase() === lowerQuery)
  );
}
