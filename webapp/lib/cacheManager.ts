/**
 * Cache manager for storing and retrieving raw API data
 */

import * as fs from 'fs';
import * as path from 'path';
import { config } from './config';
import {
  MarketData,
  TokenFills,
  TokenOutcomes,
  CachedMarketData,
  CachedFillsData,
} from './types';

export class CacheManager {
  private cacheDir: string;

  constructor(cacheDir?: string) {
    this.cacheDir = cacheDir || config.cacheDir;
    this.ensureCacheDir();
  }

  /**
   * Ensure cache directory exists
   */
  private ensureCacheDir(): void {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  /**
   * Sanitize market slug for use in filenames
   */
  private sanitizeSlug(slug: string): string {
    return slug.replace(/[/\\]/g, '_').replace(/\s+/g, '_');
  }

  /**
   * Get the cache file path for a market
   */
  private getMarketCachePath(marketSlug: string): string {
    const sanitized = this.sanitizeSlug(marketSlug);
    return path.join(this.cacheDir, `market_${sanitized}.json`);
  }

  /**
   * Get the cache file path for fills data
   */
  private getFillsCachePath(marketSlug: string): string {
    const sanitized = this.sanitizeSlug(marketSlug);
    return path.join(this.cacheDir, `fills_${sanitized}.json`);
  }

  /**
   * Save market data to cache
   */
  saveMarketData(marketSlug: string, marketData: MarketData): void {
    const cachePath = this.getMarketCachePath(marketSlug);

    const cacheObj: CachedMarketData = {
      cached_at: new Date().toISOString(),
      market_slug: marketSlug,
      data: marketData,
    };

    fs.writeFileSync(cachePath, JSON.stringify(cacheObj, null, 2));
    console.log(`Cached market data to: ${cachePath}`);
  }

  /**
   * Load market data from cache
   */
  loadMarketData(marketSlug: string): MarketData | null {
    const cachePath = this.getMarketCachePath(marketSlug);

    if (!fs.existsSync(cachePath)) {
      return null;
    }

    const cacheObj: CachedMarketData = JSON.parse(
      fs.readFileSync(cachePath, 'utf-8')
    );

    console.log(`Loaded market data from cache: ${cachePath}`);
    return cacheObj.data;
  }

  /**
   * Save fills data to cache
   */
  saveFillsData(
    marketSlug: string,
    tokenFills: TokenFills,
    tokenOutcomes: TokenOutcomes
  ): void {
    const cachePath = this.getFillsCachePath(marketSlug);

    const totalFills = Object.values(tokenFills).reduce(
      (sum, fills) => sum + fills.length,
      0
    );

    const cacheObj: CachedFillsData = {
      cached_at: new Date().toISOString(),
      market_slug: marketSlug,
      token_outcomes: tokenOutcomes,
      token_fills: tokenFills,
      total_fills: totalFills,
    };

    fs.writeFileSync(cachePath, JSON.stringify(cacheObj, null, 2));
    console.log(`Cached fills data to: ${cachePath}`);
    console.log(`Total fills cached: ${totalFills}`);
  }

  /**
   * Load fills data from cache
   */
  loadFillsData(marketSlug: string): {
    token_fills: TokenFills;
    token_outcomes: TokenOutcomes;
  } | null {
    const cachePath = this.getFillsCachePath(marketSlug);

    if (!fs.existsSync(cachePath)) {
      return null;
    }

    const cacheObj: CachedFillsData = JSON.parse(
      fs.readFileSync(cachePath, 'utf-8')
    );

    console.log(`Loaded fills data from cache: ${cachePath}`);
    console.log(`Total fills in cache: ${cacheObj.total_fills}`);

    return {
      token_fills: cacheObj.token_fills,
      token_outcomes: cacheObj.token_outcomes,
    };
  }

  /**
   * Check if market data is cached
   */
  hasMarketCache(marketSlug: string): boolean {
    return fs.existsSync(this.getMarketCachePath(marketSlug));
  }

  /**
   * Check if fills data is cached
   */
  hasFillsCache(marketSlug: string): boolean {
    return fs.existsSync(this.getFillsCachePath(marketSlug));
  }

  /**
   * Clear cache files
   */
  clearCache(marketSlug?: string): void {
    if (marketSlug) {
      // Clear specific market
      const marketPath = this.getMarketCachePath(marketSlug);
      const fillsPath = this.getFillsCachePath(marketSlug);

      if (fs.existsSync(marketPath)) {
        fs.unlinkSync(marketPath);
        console.log(`Removed market cache: ${marketPath}`);
      }

      if (fs.existsSync(fillsPath)) {
        fs.unlinkSync(fillsPath);
        console.log(`Removed fills cache: ${fillsPath}`);
      }
    } else {
      // Clear all cache
      const files = fs.readdirSync(this.cacheDir);
      for (const file of files) {
        const filepath = path.join(this.cacheDir, file);
        if (fs.statSync(filepath).isFile()) {
          fs.unlinkSync(filepath);
        }
      }
      console.log(`Cleared all cache in ${this.cacheDir}`);
    }
  }
}

