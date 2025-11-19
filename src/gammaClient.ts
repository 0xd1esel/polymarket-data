/**
 * Client for interacting with Polymarket Gamma API
 */

import axios, { AxiosInstance } from 'axios';
import axiosRetry from 'axios-retry';
import { config } from './config';
import { MarketData, EventData, TokenOutcomes } from './types';

export class GammaAPIClient {
    private client: AxiosInstance;

    constructor() {
        this.client = axios.create({
            baseURL: config.gammaApiBaseUrl,
            timeout: config.requestTimeout,
        });

        // Configure retry logic
        axiosRetry(this.client, {
            retries: config.maxRetries,
            retryDelay: (retryCount) => {
                return axiosRetry.exponentialDelay(retryCount, undefined, config.retryDelay);
            },
            retryCondition: (error) => {
                // Retry on network errors and 5xx errors
                return axiosRetry.isNetworkOrIdempotentRequestError(error) ||
                    (error.response?.status === 429); // Rate limit
            },
            onRetry: (retryCount, error, requestConfig) => {
                console.log(`Retry attempt ${retryCount} for ${requestConfig.url}`);

                // If rate limited, wait longer
                if (error.response?.status === 429) {
                    const retryAfter = error.response.headers['retry-after'];
                    if (retryAfter) {
                        const delayMs = parseInt(retryAfter) * 1000;
                        return new Promise(resolve => setTimeout(resolve, delayMs));
                    }
                }
            },
        });
    }

    /**
     * Get event by slug - events contain multiple markets
     */
    async getEventBySlug(slug: string): Promise<EventData> {
        console.log(`Fetching event: ${slug}`);
        const response = await this.client.get<EventData>(`/events/slug/${slug}`);
        return response.data;
    }

    /**
     * Get market details by slug
     * Note: The API doesn't support direct slug lookup, so we search through markets
     */
    async getMarketBySlug(slug: string): Promise<MarketData> {
        // First, try to get it as an event slug
        try {
            const event = await this.getEventBySlug(slug);

            // If it's an event with multiple markets, we'll combine them
            console.log(`Found event: ${event.title}`);
            console.log(`This event contains ${event.markets.length} markets`);

            // Return a pseudo-market that represents all markets in the event
            const combinedMarket: MarketData = {
                id: event.id,
                slug: event.slug,
                question: event.title,
                description: event.description,
                closed: event.markets.every(m => m.closed),
                markets: event.markets,
            };

            return combinedMarket;
        } catch (error: any) {
            if (error?.response?.status !== 404) {
                throw error;
            }
            // If not found as event, try searching markets
        }

        console.log(`Not found as event, searching markets: ${slug}`);

        // Search through markets to find matching slug
        let offset = 0;
        const limit = 100;
        const maxPages = 50;

        for (let page = 0; page < maxPages; page++) {
            const markets = await this.getMarkets(undefined, limit, offset);

            if (markets.length === 0) {
                break;
            }

            const market = markets.find(m => m.slug === slug);
            if (market) {
                console.log(`Found market: ${market.question}`);
                return market;
            }

            offset += limit;
        }

        throw new Error(`Market or event with slug "${slug}" not found`);
    }

    /**
     * Get markets with optional filtering
     */
    async getMarkets(
        closed?: boolean,
        limit: number = 100,
        offset: number = 0
    ): Promise<MarketData[]> {
        const params: any = { limit, offset };
        if (closed !== undefined) {
            params.closed = closed;
        }

        console.log(`Fetching markets with params:`, params);
        const response = await this.client.get<MarketData[]>('/markets', { params });
        return response.data;
    }

    /**
     * Extract token IDs from market data
     * Handles both legacy tokens format and new clobTokenIds format
     */
    extractTokenIds(marketData: MarketData): TokenOutcomes {
        const tokenOutcomes: TokenOutcomes = {};

        // Check if this is a combined event with multiple markets
        if ((marketData as any).markets && Array.isArray((marketData as any).markets)) {
            const markets = (marketData as any).markets as MarketData[];

            for (const market of markets) {
                const marketTokens = this.extractTokenIds(market);
                Object.assign(tokenOutcomes, marketTokens);
            }

            return tokenOutcomes;
        }

        // Handle new clobTokenIds format (JSON string arrays)
        if (marketData.clobTokenIds && marketData.outcomes) {
            try {
                const tokenIds: string[] = JSON.parse(marketData.clobTokenIds);
                const outcomes: string[] = JSON.parse(marketData.outcomes);

                for (let i = 0; i < tokenIds.length; i++) {
                    const tokenId = tokenIds[i];
                    const outcome = outcomes[i] || 'UNKNOWN';
                    tokenOutcomes[tokenId] = `${marketData.question} - ${outcome}`;
                }
            } catch (error) {
                console.error(`Error parsing clobTokenIds for market ${marketData.question}:`, error);
            }
        }

        // Handle legacy tokens format
        if (marketData.tokens && Array.isArray(marketData.tokens)) {
            for (const token of marketData.tokens) {
                if (token.token_id) {
                    tokenOutcomes[token.token_id] = token.outcome || 'UNKNOWN';
                }
            }
        }

        return tokenOutcomes;
    }

    /**
     * Get all token IDs as an array
     */
    getTokenIdList(marketData: MarketData): string[] {
        const tokenOutcomes = this.extractTokenIds(marketData);
        return Object.keys(tokenOutcomes);
    }
}

