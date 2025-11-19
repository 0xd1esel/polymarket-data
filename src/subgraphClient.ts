/**
 * Client for interacting with Polymarket Subgraph GraphQL API
 */

import { GraphQLClient } from 'graphql-request';
import pLimit from 'p-limit';
import { config } from './config';
import { OrderFillEvent, TokenFills } from './types';

const FILLS_QUERY = `
  query GetSingleTokenFills($tokenId: String!, $first: Int!, $skip: Int!) {
    orderFilledEvents(
      where: {
        or: [
          { makerAssetId: $tokenId }
          { takerAssetId: $tokenId }
        ]
      }
      orderBy: timestamp
      orderDirection: desc
      first: $first
      skip: $skip
    ) {
      id
      transactionHash
      timestamp
      orderHash
      maker
      taker
      makerAssetId
      takerAssetId
      makerAmountFilled
      takerAmountFilled
      fee
    }
  }
`;

interface FillsResponse {
    orderFilledEvents: OrderFillEvent[];
}

export class SubgraphClient {
    private client: GraphQLClient;

    constructor() {
        this.client = new GraphQLClient(config.polymarketSubgraphUrl);
    }

    /**
     * Get all fill events for a specific token with pagination
     */
    async getTokenFills(tokenId: string): Promise<OrderFillEvent[]> {
        const allFills: OrderFillEvent[] = [];
        let skip = 0;
        const pageSize = config.graphqlPageSize;

        console.log(`Fetching fills for token ${tokenId.slice(0, 16)}...`);

        while (true) {
            try {
                const variables = {
                    tokenId,
                    first: pageSize,
                    skip,
                };

                const response = await this.client.request<FillsResponse>(
                    FILLS_QUERY,
                    variables
                );

                const fills = response.orderFilledEvents || [];

                if (fills.length === 0) {
                    break;
                }

                allFills.push(...fills);
                console.log(`  Fetched ${fills.length} fills (total: ${allFills.length})`);

                if (fills.length < pageSize) {
                    // Last page
                    break;
                }

                skip += pageSize;

                // Small delay to be respectful to the API
                await this.delay(100);
            } catch (error) {
                if (this.isRateLimitError(error)) {
                    console.log('Rate limited on GraphQL. Waiting 60 seconds...');
                    await this.delay(60000);
                    continue;
                }
                throw error;
            }
        }

        console.log(`Total fills for token ${tokenId.slice(0, 16)}: ${allFills.length}`);
        return allFills;
    }

    /**
     * Get fills for multiple tokens concurrently
     */
    async getMultipleTokenFills(
        tokenIds: string[],
        maxConcurrent: number = config.maxConcurrentRequests
    ): Promise<TokenFills> {
        const limit = pLimit(maxConcurrent);
        const tokenFills: TokenFills = {};

        console.log(`\nFetching fills for ${tokenIds.length} tokens (max ${maxConcurrent} concurrent)...\n`);

        const promises = tokenIds.map(tokenId =>
            limit(async () => {
                try {
                    const fills = await this.getTokenFills(tokenId);
                    tokenFills[tokenId] = fills;
                } catch (error) {
                    console.error(`Error fetching fills for token ${tokenId}:`, error);
                    tokenFills[tokenId] = [];
                }
            })
        );

        await Promise.all(promises);

        return tokenFills;
    }

    /**
     * Check if error is a rate limit error
     */
    private isRateLimitError(error: any): boolean {
        return (
            error?.response?.status === 429 ||
            error?.message?.toLowerCase().includes('rate limit')
        );
    }

    /**
     * Delay helper
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

