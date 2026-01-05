#!/usr/bin/env node

/**
 * Migration Script: Music Library → Catalog
 *
 * Migrates old music tracks from assets/music-library/ to the new unified catalog:
 * - Reads music-library/index.json
 * - Converts audioBase64 to MP3 files
 * - Creates Asset entries in catalog/music/
 * - Backs up old library before deletion
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ASSETS_DIR = path.resolve(__dirname, '..', 'assets');
const OLD_LIBRARY_DIR = path.join(ASSETS_DIR, 'music-library');
const OLD_INDEX_FILE = path.join(OLD_LIBRARY_DIR, 'index.json');
const CATALOG_DIR = path.join(ASSETS_DIR, 'catalog');
const CATALOG_INDEX = path.join(CATALOG_DIR, 'index.json');
const CATALOG_MUSIC_DIR = path.join(CATALOG_DIR, 'music');

async function migrate() {
  console.log('🎵 Music Library Migration');
  console.log('========================\n');

  // Check if old library exists
  try {
    await fs.access(OLD_INDEX_FILE);
  } catch {
    console.log('✅ No old music library found - nothing to migrate!');
    return;
  }

  // Read old library
  console.log('📖 Reading old music library...');
  const oldLibraryData = await fs.readFile(OLD_INDEX_FILE, 'utf-8');
  const oldLibrary = JSON.parse(oldLibraryData);
  const oldTracks = oldLibrary.tracks || [];

  console.log(`   Found ${oldTracks.length} tracks to migrate\n`);

  if (oldTracks.length === 0) {
    console.log('✅ Library is empty - backing up and removing...');
    await backupAndDelete();
    return;
  }

  // Ensure catalog directories exist
  await fs.mkdir(CATALOG_MUSIC_DIR, { recursive: true });

  // Read catalog index
  let catalog;
  try {
    const catalogData = await fs.readFile(CATALOG_INDEX, 'utf-8');
    catalog = JSON.parse(catalogData);
  } catch {
    catalog = {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      assets: [],
    };
  }

  // Migrate each track
  let migratedCount = 0;
  let skippedCount = 0;

  for (const track of oldTracks) {
    console.log(`🎵 Migrating: ${track.name || track.id}`);

    // Check if already migrated (by looking for same prompt)
    const alreadyExists = catalog.assets.some(
      asset => asset.type === 'music' && asset.prompt === track.prompt
    );

    if (alreadyExists) {
      console.log(`   ⏭️  Skipped (already in catalog)`);
      skippedCount++;
      continue;
    }

    try {
      // Generate new IDs and filename
      const assetId = generateAssetId('music');
      const timestamp = Date.now();
      const modelSlug = (track.model || 'unknown').toLowerCase().replace(/\s+/g, '-');
      const filename = `music-${timestamp}-${track.provider}-${modelSlug}.mp3`;

      // Convert base64 to buffer
      let audioBuffer;
      if (track.audioBase64) {
        // Remove data URL prefix if present
        const base64Data = track.audioBase64.replace(/^data:audio\/[^;]+;base64,/, '');
        audioBuffer = Buffer.from(base64Data, 'base64');
      } else if (track.filename) {
        // Try to read from old file
        const oldFilePath = path.join(OLD_LIBRARY_DIR, track.filename);
        audioBuffer = await fs.readFile(oldFilePath);
      } else {
        console.log(`   ❌ No audio data found - skipping`);
        skippedCount++;
        continue;
      }

      // Save to catalog/music/
      const filePath = path.join(CATALOG_MUSIC_DIR, filename);
      await fs.writeFile(filePath, audioBuffer);

      // Create Asset entry
      const asset = {
        id: assetId,
        type: 'music',
        filename,
        url: `/assets/catalog/music/${filename}`,
        provider: track.provider || 'unknown',
        model: track.model || 'unknown',
        prompt: track.prompt || '',
        status: 'ready',
        createdAt: track.generatedAt || track.savedAt || new Date().toISOString(),
        completedAt: track.savedAt || new Date().toISOString(),
        estimatedCost: track.estimatedCost || 0,
        generationTimeMs: track.generationTimeMs || 0,
        metadata: {
          name: track.name || 'Untitled Track',
          duration: track.duration || 0,
          lyrics: track.lyrics,
          style: track.style,
          format: 'mp3',
          migratedFrom: 'music-library',
          originalId: track.id,
        },
      };

      catalog.assets.push(asset);
      migratedCount++;

      const fileSizeKB = Math.round(audioBuffer.length / 1024);
      console.log(`   ✅ Saved (${fileSizeKB}KB) → ${filename}`);

    } catch (error) {
      console.error(`   ❌ Failed:`, error.message);
      skippedCount++;
    }
  }

  // Save updated catalog
  console.log('\n💾 Saving catalog...');
  catalog.lastUpdated = new Date().toISOString();
  await fs.writeFile(CATALOG_INDEX, JSON.stringify(catalog, null, 2));

  console.log('\n📊 Migration Summary');
  console.log('===================');
  console.log(`✅ Migrated: ${migratedCount} tracks`);
  console.log(`⏭️  Skipped:  ${skippedCount} tracks`);
  console.log(`📦 Total:    ${oldTracks.length} tracks\n`);

  // Backup and delete old library
  if (migratedCount > 0) {
    await backupAndDelete();
  }

  console.log('✨ Migration complete!\n');
}

async function backupAndDelete() {
  const backupDir = path.join(ASSETS_DIR, 'music-library.backup');

  console.log('📦 Backing up old library...');
  try {
    // Remove old backup if exists
    await fs.rm(backupDir, { recursive: true, force: true });
    // Create new backup
    await fs.cp(OLD_LIBRARY_DIR, backupDir, { recursive: true });
    console.log(`   ✅ Backed up to: ${path.relative(process.cwd(), backupDir)}`);
  } catch (error) {
    console.error(`   ❌ Backup failed:`, error.message);
    return;
  }

  console.log('🗑️  Deleting old library...');
  try {
    await fs.rm(OLD_LIBRARY_DIR, { recursive: true });
    console.log(`   ✅ Deleted: ${path.relative(process.cwd(), OLD_LIBRARY_DIR)}`);
  } catch (error) {
    console.error(`   ❌ Delete failed:`, error.message);
  }
}

function generateAssetId(type) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `asset_${type}_${timestamp}_${random}`;
}

// Run migration
migrate().catch(error => {
  console.error('💥 Migration failed:', error);
  process.exit(1);
});
