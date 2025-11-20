/**
 * Main orchestrator script for fetching Polymarket data
 */

import { GammaAPIClient } from './gammaClient';
import { SubgraphClient } from './subgraphClient';
import { FillsProcessor } from './dataProcessor';
import { CacheManager } from './cacheManager';
import { CSVExporter } from './csvExporter';
import { ExcelExporter } from './excelExporter';

interface FetchOptions {
  marketSlug: string;
  useCache?: boolean;
  skipFetch?: boolean; // Use cached data only and regenerate CSV
}

/**
 * Main function to fetch and process Polymarket data
 */
async function fetchPolymarketData(options: FetchOptions): Promise<void> {
  const { marketSlug, useCache = true, skipFetch = false } = options;

  console.log('='.repeat(60));
  console.log('POLYMARKET DATA FETCHER');
  console.log('='.repeat(60));
  console.log(`Market Slug: ${marketSlug}`);
  console.log(`Use Cache: ${useCache}`);
  console.log(`Skip Fetch: ${skipFetch}`);
  console.log('='.repeat(60) + '\n');

  // Initialize clients
  const gammaClient = new GammaAPIClient();
  const subgraphClient = new SubgraphClient();
  const processor = new FillsProcessor();
  const cacheManager = new CacheManager();
  const csvExporter = new CSVExporter();
  const excelExporter = new ExcelExporter();

  try {
    let tokenFills;
    let tokenOutcomes;

    if (skipFetch && useCache) {
      // Only use cached data
      console.log('\n[1/3] Loading cached fills data...\n');
      const cachedFills = cacheManager.loadFillsData(marketSlug);

      if (!cachedFills) {
        throw new Error(`No cached fills data found for ${marketSlug}. Run without --skip-fetch first.`);
      }

      tokenFills = cachedFills.token_fills;
      tokenOutcomes = cachedFills.token_outcomes;
    } else {
      // Fetch market data
      console.log('\n[1/3] Fetching market data...\n');
      let marketData;

      if (useCache && cacheManager.hasMarketCache(marketSlug)) {
        marketData = cacheManager.loadMarketData(marketSlug);
      } else {
        marketData = await gammaClient.getMarketBySlug(marketSlug);
        cacheManager.saveMarketData(marketSlug, marketData);
      }

      if (!marketData) {
        throw new Error(`Failed to fetch market data for ${marketSlug}`);
      }

      console.log(`\nMarket: ${marketData.question}`);
      console.log(`Closed: ${marketData.closed}`);

      // Extract token IDs
      tokenOutcomes = gammaClient.extractTokenIds(marketData);
      const tokenIds = Object.keys(tokenOutcomes);

      console.log(`\nTokens found: ${tokenIds.length}`);
      for (const [tokenId, outcome] of Object.entries(tokenOutcomes)) {
        console.log(`  ${outcome}: ${tokenId.slice(0, 16)}...`);
      }

      // Fetch fills data
      console.log('\n[2/3] Fetching fills data...\n');

      if (useCache && cacheManager.hasFillsCache(marketSlug)) {
        const cachedFills = cacheManager.loadFillsData(marketSlug);
        if (cachedFills) {
          tokenFills = cachedFills.token_fills;
          tokenOutcomes = cachedFills.token_outcomes;
        } else {
          tokenFills = await subgraphClient.getMultipleTokenFills(tokenIds);
          cacheManager.saveFillsData(marketSlug, tokenFills, tokenOutcomes);
        }
      } else {
        tokenFills = await subgraphClient.getMultipleTokenFills(tokenIds);
        cacheManager.saveFillsData(marketSlug, tokenFills, tokenOutcomes);
      }
    }

    // Process fills
    console.log('\n[3/3] Processing and exporting data...\n');
    const processedFills = processor.processMarketFills(tokenFills, tokenOutcomes);

    if (processedFills.length === 0) {
      console.log('No fills found for this market.');
      return;
    }

    // Export to CSV - one file per token
    await csvExporter.exportPerToken(processedFills, marketSlug);
    await csvExporter.exportSummary(processedFills, marketSlug);

    // Export to Excel - combined workbook
    await excelExporter.exportToExcel(processedFills, tokenOutcomes, marketSlug);

    // Print statistics
    csvExporter.printStatistics(processedFills);

    console.log('✓ Done!');
  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error);
    throw error;
  }
}

/**
 * Parse command line arguments
 */
function parseArgs(): FetchOptions {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
Usage: npm run fetch -- <market-slug> [options]

Arguments:
  <market-slug>    The Polymarket market slug (required)

Options:
  --no-cache       Don't use cached data, fetch fresh
  --skip-fetch     Use cached data only and regenerate CSV
  --help, -h       Show this help message

Examples:
  npm run fetch -- will-donald-trump-win-2024-election
  npm run fetch -- will-donald-trump-win-2024-election --no-cache
  npm run fetch -- will-donald-trump-win-2024-election --skip-fetch
    `);
    process.exit(0);
  }

  const marketSlug = args.find(arg => !arg.startsWith('--'));
  if (!marketSlug) {
    console.error('Error: Market slug is required');
    process.exit(1);
  }

  const options: FetchOptions = {
    marketSlug,
    useCache: !args.includes('--no-cache'),
    skipFetch: args.includes('--skip-fetch'),
  };

  return options;
}

// Main execution
if (require.main === module) {
  const options = parseArgs();
  fetchPolymarketData(options)
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

export { fetchPolymarketData };

