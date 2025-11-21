import { NextRequest, NextResponse } from 'next/server';
import { GammaAPIClient } from '@/lib/gammaClient';
import { SubgraphClient } from '@/lib/subgraphClient';
import { FillsProcessor } from '@/lib/dataProcessor';
import { CacheManager } from '@/lib/cacheManager';
import { Workbook } from 'exceljs';
import { ProcessedFill, TokenOutcomes } from '@/lib/types';

// Initialize clients (singleton pattern)
const gammaClient = new GammaAPIClient();
const subgraphClient = new SubgraphClient();
const processor = new FillsProcessor();
const cacheManager = new CacheManager('/tmp/polymarket-cache');

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Max execution time for Vercel Pro (10s for Hobby)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { slug, useCache = true } = body;

    if (!slug) {
      return NextResponse.json({ error: 'Market slug is required' }, { status: 400 });
    }

    console.log(`[${slug}] Starting fetch...`);

    // Get market data
    console.log(`[${slug}] Fetching market data...`);
    const marketData = await gammaClient.getMarketBySlug(slug);
    const tokenOutcomes = gammaClient.extractTokenIds(marketData);
    const tokenIdArray = Object.keys(tokenOutcomes);

    if (tokenIdArray.length === 0) {
      throw new Error('No tokens found for this market');
    }

    // Fetch fills data
    console.log(`[${slug}] Fetching fills for ${tokenIdArray.length} tokens...`);
    let tokenFills;

    if (useCache && cacheManager.hasFillsCache(slug)) {
      const cachedFills = cacheManager.loadFillsData(slug);
      if (cachedFills) {
        tokenFills = cachedFills.token_fills;
        console.log(`[${slug}] Using cached fills data`);
      } else {
        tokenFills = await subgraphClient.getMultipleTokenFills(tokenIdArray);
        cacheManager.saveFillsData(slug, tokenFills, tokenOutcomes);
      }
    } else {
      tokenFills = await subgraphClient.getMultipleTokenFills(tokenIdArray);
      cacheManager.saveFillsData(slug, tokenFills, tokenOutcomes);
    }

    // Process fills
    console.log(`[${slug}] Processing fills...`);
    const processedFills = processor.processMarketFills(tokenFills, tokenOutcomes);

    if (processedFills.length === 0) {
      throw new Error('No fills found for this market');
    }

    // Generate Excel file in memory
    console.log(`[${slug}] Generating Excel workbook...`);
    const buffer = await generateExcelInMemory(processedFills, tokenOutcomes, slug);

    console.log(`[${slug}] Done! Generated ${buffer.length} bytes`);

    // Convert buffer to Uint8Array for Response compatibility
    const uint8Array = new Uint8Array(buffer);

    // Return the file directly
    return new Response(uint8Array, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${slug}.xlsx"`,
        'Content-Length': buffer.length.toString(),
      },
    });

  } catch (error: any) {
    console.error('Error processing market:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred while processing the market' },
      { status: 500 }
    );
  }
}

/**
 * Generate Excel workbook in memory (Vercel-compatible)
 */
async function generateExcelInMemory(
  processedFills: ProcessedFill[],
  tokenOutcomes: TokenOutcomes,
  marketSlug: string
): Promise<Buffer> {
  const workbook = new Workbook();
  workbook.creator = 'The Maximizer v2.0';
  workbook.created = new Date();

  // Import the Excel generation logic
  const { createExcelWorkbook } = await import('@/lib/excelGenerator');
  await createExcelWorkbook(workbook, processedFills, tokenOutcomes);

  // Write to buffer instead of file
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

