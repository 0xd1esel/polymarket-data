/**
 * Data processing and price calculation for Polymarket fills
 */

import { format } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { config } from './config';
import { OrderFillEvent, ProcessedFill, TokenFills, TokenOutcomes } from './types';

export class FillsProcessor {
  /**
   * Calculate the fill price for a specific token
   * 
   * For Polymarket:
   * - When makerAssetId is the token and takerAssetId is "0" (USDC):
   *   Price = takerAmountFilled / makerAmountFilled
   * - When takerAssetId is the token and makerAssetId is "0" (USDC):
   *   Price = makerAmountFilled / takerAmountFilled
   * 
   * Both amounts are in 6 decimals (USDC standard).
   */
  calculateFillPrice(fill: OrderFillEvent, tokenId: string): number | null {
    const makerAsset = fill.makerAssetId;
    const takerAsset = fill.takerAssetId;
    const makerAmount = parseFloat(fill.makerAmountFilled);
    const takerAmount = parseFloat(fill.takerAmountFilled);

    const DECIMALS = 1_000_000;

    if (makerAsset === tokenId && takerAsset === '0') {
      // Maker is selling the token for USDC
      if (makerAmount === 0) return 0;
      return (takerAmount / DECIMALS) / (makerAmount / DECIMALS);
    } else if (takerAsset === tokenId && makerAsset === '0') {
      // Taker is buying the token with USDC
      if (takerAmount === 0) return 0;
      return (makerAmount / DECIMALS) / (takerAmount / DECIMALS);
    } else {
      // Both assets are tokens (rare case, token-to-token trade)
      return null;
    }
  }

  /**
   * Calculate the amount of the token traded
   */
  calculateFillAmount(fill: OrderFillEvent, tokenId: string): number {
    const makerAsset = fill.makerAssetId;
    const takerAsset = fill.takerAssetId;
    const DECIMALS = 1_000_000;

    if (makerAsset === tokenId) {
      return parseFloat(fill.makerAmountFilled) / DECIMALS;
    } else if (takerAsset === tokenId) {
      return parseFloat(fill.takerAmountFilled) / DECIMALS;
    } else {
      return 0;
    }
  }

  /**
   * Convert Unix timestamp to PST/PDT datetime string
   */
  formatTimestamp(timestamp: string): string {
    const date = new Date(parseInt(timestamp) * 1000);
    return formatInTimeZone(
      date,
      config.outputTimezone,
      'yyyy-MM-dd HH:mm:ss zzz'
    );
  }

  /**
   * Determine if this was a buy or sell from the token's perspective
   */
  getTradeSide(fill: OrderFillEvent, tokenId: string): 'BUY' | 'SELL' | 'UNKNOWN' {
    if (fill.takerAssetId === tokenId) {
      return 'BUY';
    } else if (fill.makerAssetId === tokenId) {
      return 'SELL';
    } else {
      return 'UNKNOWN';
    }
  }

  /**
   * Process fills data into structured format for CSV export
   */
  processFills(
    fills: OrderFillEvent[],
    tokenId: string,
    outcome: string = 'UNKNOWN'
  ): ProcessedFill[] {
    const processedFills: ProcessedFill[] = [];

    for (const fill of fills) {
      const price = this.calculateFillPrice(fill, tokenId);

      // Skip token-to-token trades
      if (price === null) {
        continue;
      }

      const amount = this.calculateFillAmount(fill, tokenId);
      const side = this.getTradeSide(fill, tokenId);

      const processedFill: ProcessedFill = {
        outcome,
        token_id: tokenId,
        timestamp_unix: fill.timestamp,
        timestamp_pst: this.formatTimestamp(fill.timestamp),
        price: Math.round(price * 1_000_000) / 1_000_000, // Round to 6 decimals
        amount: Math.round(amount * 100) / 100, // Round to 2 decimals
        side,
        transaction_hash: fill.transactionHash,
        order_hash: fill.orderHash,
        maker: fill.maker,
        taker: fill.taker,
        fee: fill.fee,
      };

      processedFills.push(processedFill);
    }

    return processedFills;
  }

  /**
   * Process fills for all tokens in a market
   */
  processMarketFills(
    tokenFills: TokenFills,
    tokenOutcomes: TokenOutcomes
  ): ProcessedFill[] {
    const allProcessed: ProcessedFill[] = [];

    for (const [tokenId, fills] of Object.entries(tokenFills)) {
      const outcome = tokenOutcomes[tokenId] || 'UNKNOWN';
      const processed = this.processFills(fills, tokenId, outcome);
      allProcessed.push(...processed);
    }

    // Sort by timestamp (most recent first)
    allProcessed.sort((a, b) => parseInt(b.timestamp_unix) - parseInt(a.timestamp_unix));

    return allProcessed;
  }
}

