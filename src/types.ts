/**
 * Type definitions for Polymarket data
 */

export interface MarketToken {
    token_id: string;
    outcome: string;
    price?: string;
    winner?: boolean;
}

export interface MarketData {
    id: string;
    slug: string;
    question: string;
    description?: string;
    closed: boolean;
    clobTokenIds?: string; // JSON string array
    outcomes?: string; // JSON string array
    tokens?: MarketToken[]; // Legacy field
    [key: string]: any;
}

export interface EventData {
    id: string;
    slug: string;
    title: string;
    description?: string;
    markets: MarketData[];
    [key: string]: any;
}

export interface OrderFillEvent {
    id: string;
    transactionHash: string;
    timestamp: string;
    orderHash: string;
    maker: string;
    taker: string;
    makerAssetId: string;
    takerAssetId: string;
    makerAmountFilled: string;
    takerAmountFilled: string;
    fee: string;
}

export interface ProcessedFill {
    outcome: string;
    token_id: string;
    timestamp_unix: string;
    timestamp_pst: string;
    price: number;
    amount: number;
    side: 'BUY' | 'SELL' | 'UNKNOWN';
    transaction_hash: string;
    order_hash: string;
    maker: string;
    taker: string;
    fee: string;
}

export interface TokenFills {
    [tokenId: string]: OrderFillEvent[];
}

export interface TokenOutcomes {
    [tokenId: string]: string;
}

export interface CachedMarketData {
    cached_at: string;
    market_slug: string;
    data: MarketData;
}

export interface CachedFillsData {
    cached_at: string;
    market_slug: string;
    token_outcomes: TokenOutcomes;
    token_fills: TokenFills;
    total_fills: number;
}

