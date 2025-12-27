// Test script for Kybernesis using the fixed client
// Run: npx tsx scratch/test-kybernesis.ts

import 'dotenv/config';
import { searchMemories, isConfigured } from '../src/tools/kybernesis/client.js';

async function testSearch() {
  console.log('Testing Kybernesis search (fixed client)...');
  console.log('Configured:', isConfigured());
  console.log('');

  if (!isConfigured()) {
    console.log('ERROR: Kybernesis not configured');
    return;
  }

  try {
    console.log('Searching for: "branding"');
    const result = await searchMemories('branding', 5);
    console.log('');
    console.log('Query:', result.query);
    console.log('');
    console.log('Response text:');
    console.log(result.text);
  } catch (error) {
    console.error('Error:', error);
  }
}

testSearch();
