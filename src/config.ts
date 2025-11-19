/**
 * Configuration for Polymarket data fetcher
 */

export const config = {
  // API Endpoints
  gammaApiBaseUrl: 'https://gamma-api.polymarket.com',
  polymarketSubgraphUrl: 'https://api.goldsky.com/api/public/project_cl6mb8i9h0003e201j6li0diw/subgraphs/orderbook-subgraph/0.0.1/gn',
  
  // Rate limiting
  maxConcurrentRequests: 5,
  requestTimeout: 30000, // 30 seconds
  maxRetries: 5,
  retryDelay: 1000, // 1 second initial delay
  
  // GraphQL query settings
  graphqlPageSize: 1000,
  
  // Cache settings
  cacheDir: 'cache',
  outputDir: 'output',
  
  // Timezone for output
  outputTimezone: 'America/Los_Angeles', // PST/PDT
} as const;

