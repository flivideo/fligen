/**
 * CSV Processing Utilities
 * FR25.3: CSV Upload Endpoint
 * FR25.4: CSV Update Endpoint
 */

import fs from 'fs';
import csvParser from 'csv-parser';
import { stringify } from 'csv-stringify/sync';
import type { CsvRow } from './types';

/**
 * Parse CSV file into rows
 *
 * @param filePath - Path to CSV file
 * @returns Array of parsed CSV rows
 */
export async function parseCsv(filePath: string): Promise<CsvRow[]> {
  return new Promise((resolve, reject) => {
    const rows: CsvRow[] = [];

    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on('data', (row) => {
        rows.push(row as CsvRow);
      })
      .on('end', () => {
        resolve(rows);
      })
      .on('error', (err) => {
        reject(err);
      });
  });
}

/**
 * Filter CSV rows to only active prompts (a=1)
 *
 * @param rows - All CSV rows
 * @returns Filtered rows with a=1
 */
export function filterActiveRows(rows: CsvRow[]): CsvRow[] {
  return rows.filter((row) => row.a === '1');
}

/**
 * Update CSV file, marking completed prompts as a=9
 *
 * @param filePath - Path to original CSV file
 * @param completedIds - Array of completed filename IDs
 * @returns Path to updated CSV file
 */
export async function updateCsv(
  filePath: string,
  completedIds: string[]
): Promise<string> {
  const rows = await parseCsv(filePath);

  // Mark completed rows as a=9
  rows.forEach((row) => {
    if (completedIds.includes(row.filename)) {
      row.a = '9';
    }
  });

  // Generate updated CSV
  const updatedPath = filePath.replace('.csv', '_updated.csv');
  const csv = stringify(rows, { header: true });
  fs.writeFileSync(updatedPath, csv);

  return updatedPath;
}

/**
 * Validate CSV row structure
 *
 * @param row - CSV row to validate
 * @returns True if valid, false otherwise
 */
export function isValidCsvRow(row: any): row is CsvRow {
  return (
    typeof row.a === 'string' &&
    typeof row.category === 'string' &&
    typeof row.filename === 'string' &&
    typeof row.prompt === 'string' &&
    (row.provider === 'fal' || row.provider === 'kie') &&
    typeof row.model === 'string'
  );
}
