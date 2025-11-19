/**
 * CSV export functionality for processed fills data
 */

import * as fs from 'fs';
import * as path from 'path';
import { createObjectCsvWriter } from 'csv-writer';
import { config } from './config';
import { ProcessedFill } from './types';

export class CSVExporter {
  private outputDir: string;

  constructor(outputDir?: string) {
    this.outputDir = outputDir || config.outputDir;
    this.ensureOutputDir();
  }

  /**
   * Ensure output directory exists
   */
  private ensureOutputDir(): void {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * Sanitize market slug for use in filenames
   */
  private sanitizeSlug(slug: string): string {
    return slug.replace(/[/\\]/g, '_').replace(/\s+/g, '_');
  }

  /**
   * Get the output CSV file path
   */
  getOutputPath(marketSlug: string, suffix: string = ''): string {
    const sanitized = this.sanitizeSlug(marketSlug);
    const filename = suffix ? `${sanitized}_${suffix}.csv` : `${sanitized}.csv`;
    return path.join(this.outputDir, filename);
  }

  /**
   * Export processed fills to CSV (combined file)
   */
  async exportToCSV(
    processedFills: ProcessedFill[],
    marketSlug: string,
    outputPath?: string
  ): Promise<string | null> {
    if (processedFills.length === 0) {
      console.log('No fills to export!');
      return null;
    }

    const filePath = outputPath || this.getOutputPath(marketSlug);

    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: [
        { id: 'timestamp_pst', title: 'Timestamp (PST)' },
        { id: 'timestamp_unix', title: 'Timestamp (Unix)' },
        { id: 'outcome', title: 'Outcome' },
        { id: 'side', title: 'Side' },
        { id: 'price', title: 'Price' },
        { id: 'amount', title: 'Amount' },
        { id: 'transaction_hash', title: 'Transaction Hash' },
        { id: 'order_hash', title: 'Order Hash' },
        { id: 'maker', title: 'Maker' },
        { id: 'taker', title: 'Taker' },
        { id: 'token_id', title: 'Token ID' },
        { id: 'fee', title: 'Fee' },
      ],
    });

    await csvWriter.writeRecords(processedFills);

    const stats = fs.statSync(filePath);
    console.log(`\nExported ${processedFills.length} fills to: ${filePath}`);
    console.log(`File size: ${(stats.size / 1024).toFixed(2)} KB`);

    return filePath;
  }

  /**
   * Export separate CSV files per token
   */
  async exportPerToken(
    processedFills: ProcessedFill[],
    marketSlug: string
  ): Promise<string[]> {
    if (processedFills.length === 0) {
      console.log('No fills to export!');
      return [];
    }

    // Group fills by token
    const fillsByToken: { [key: string]: ProcessedFill[] } = {};
    
    for (const fill of processedFills) {
      const key = `${fill.outcome}|${fill.token_id}`;
      if (!fillsByToken[key]) {
        fillsByToken[key] = [];
      }
      fillsByToken[key].push(fill);
    }

    const exportedFiles: string[] = [];

    console.log(`\nExporting ${Object.keys(fillsByToken).length} separate CSV files...`);

    for (const [key, fills] of Object.entries(fillsByToken)) {
      const outcome = fills[0].outcome;
      
      // Create a clean filename from the outcome
      const cleanOutcome = outcome
        .replace(/[^a-zA-Z0-9\s\-:]/g, '') // Remove special chars
        .replace(/\s+/g, '_') // Replace spaces with underscores
        .replace(/_+/g, '_') // Remove duplicate underscores
        .replace(/^_|_$/g, '') // Remove leading/trailing underscores
        .toLowerCase();

      const filename = `${marketSlug}_${cleanOutcome}.csv`;
      const filePath = path.join(this.outputDir, filename);

      const csvWriter = createObjectCsvWriter({
        path: filePath,
        header: [
          { id: 'timestamp_pst', title: 'Timestamp (PST)' },
          { id: 'timestamp_unix', title: 'Timestamp (Unix)' },
          { id: 'outcome', title: 'Outcome' },
          { id: 'side', title: 'Side' },
          { id: 'price', title: 'Price' },
          { id: 'amount', title: 'Amount' },
          { id: 'transaction_hash', title: 'Transaction Hash' },
          { id: 'order_hash', title: 'Order Hash' },
          { id: 'maker', title: 'Maker' },
          { id: 'taker', title: 'Taker' },
          { id: 'token_id', title: 'Token ID' },
          { id: 'fee', title: 'Fee' },
        ],
      });

      await csvWriter.writeRecords(fills);
      
      const stats = fs.statSync(filePath);
      console.log(`  ${outcome}: ${fills.length} fills (${(stats.size / 1024).toFixed(2)} KB)`);
      
      exportedFiles.push(filePath);
    }

    console.log(`\nTotal files exported: ${exportedFiles.length}`);

    return exportedFiles;
  }

  /**
   * Export a summary CSV with aggregated statistics
   */
  async exportSummary(
    processedFills: ProcessedFill[],
    marketSlug: string
  ): Promise<string | null> {
    if (processedFills.length === 0) {
      console.log('No fills to summarize!');
      return null;
    }

    // Group by outcome
    const byOutcome: { [outcome: string]: ProcessedFill[] } = {};
    for (const fill of processedFills) {
      if (!byOutcome[fill.outcome]) {
        byOutcome[fill.outcome] = [];
      }
      byOutcome[fill.outcome].push(fill);
    }

    // Calculate statistics
    const summaryData = Object.entries(byOutcome).map(([outcome, fills]) => {
      const amounts = fills.map(f => f.amount);
      const prices = fills.map(f => f.price);

      return {
        outcome,
        total_fills: fills.length,
        total_volume: amounts.reduce((a, b) => a + b, 0).toFixed(2),
        avg_volume: (amounts.reduce((a, b) => a + b, 0) / amounts.length).toFixed(2),
        min_price: Math.min(...prices).toFixed(6),
        max_price: Math.max(...prices).toFixed(6),
        avg_price: (prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(6),
        current_price: fills[0].price.toFixed(6), // Most recent
      };
    });

    const filePath = this.getOutputPath(marketSlug, 'summary');

    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: [
        { id: 'outcome', title: 'Outcome' },
        { id: 'total_fills', title: 'Total Fills' },
        { id: 'total_volume', title: 'Total Volume' },
        { id: 'avg_volume', title: 'Avg Volume' },
        { id: 'min_price', title: 'Min Price' },
        { id: 'max_price', title: 'Max Price' },
        { id: 'avg_price', title: 'Avg Price' },
        { id: 'current_price', title: 'Current Price' },
      ],
    });

    await csvWriter.writeRecords(summaryData);

    console.log(`Exported summary to: ${filePath}`);

    return filePath;
  }

  /**
   * Print statistics about the processed fills
   */
  printStatistics(processedFills: ProcessedFill[]): void {
    if (processedFills.length === 0) {
      console.log('No fills to analyze!');
      return;
    }

    console.log('\n' + '='.repeat(60));
    console.log('FILLS STATISTICS');
    console.log('='.repeat(60));

    console.log(`\nTotal Fills: ${processedFills.length}`);

    // Group by outcome
    const byOutcome: { [outcome: string]: ProcessedFill[] } = {};
    for (const fill of processedFills) {
      if (!byOutcome[fill.outcome]) {
        byOutcome[fill.outcome] = [];
      }
      byOutcome[fill.outcome].push(fill);
    }

    console.log('\nBy Outcome:');
    for (const [outcome, fills] of Object.entries(byOutcome)) {
      const totalVolume = fills.reduce((sum, f) => sum + f.amount, 0);
      const avgPrice = fills.reduce((sum, f) => sum + f.price, 0) / fills.length;
      const prices = fills.map(f => f.price);

      console.log(`  ${outcome}:`);
      console.log(`    Fills: ${fills.length}`);
      console.log(`    Total Volume: ${totalVolume.toFixed(2)}`);
      console.log(`    Avg Price: $${avgPrice.toFixed(4)}`);
      console.log(`    Current Price: $${fills[0].price.toFixed(4)}`);
      console.log(`    Min Price: $${Math.min(...prices).toFixed(4)}`);
      console.log(`    Max Price: $${Math.max(...prices).toFixed(4)}`);
    }

    // By side
    const buys = processedFills.filter(f => f.side === 'BUY').length;
    const sells = processedFills.filter(f => f.side === 'SELL').length;

    console.log('\nBy Side:');
    console.log(`  BUY: ${buys}`);
    console.log(`  SELL: ${sells}`);

    // Time range
    if (processedFills.length > 0) {
      console.log('\nTime Range:');
      console.log(`  Earliest: ${processedFills[processedFills.length - 1].timestamp_pst}`);
      console.log(`  Latest: ${processedFills[0].timestamp_pst}`);
    }

    console.log('='.repeat(60) + '\n');
  }
}

