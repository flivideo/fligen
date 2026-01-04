// Migrate Day 6 videos from video-scenes to catalog
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = resolve(__dirname, '..', 'assets');
const VIDEO_INDEX = resolve(ASSETS_DIR, 'video-scenes', 'index.json');
const CATALOG_INDEX = resolve(ASSETS_DIR, 'catalog', 'index.json');

// Read both indexes
const videoIndex = JSON.parse(readFileSync(VIDEO_INDEX, 'utf-8'));
const catalog = JSON.parse(readFileSync(CATALOG_INDEX, 'utf-8'));

// Filter for completed videos only
const completedVideos = videoIndex.videos.filter(v => v.status === 'completed' && v.url);

// Group by filename and take the latest for each unique file
const latestByFilename = {};
completedVideos.forEach(v => {
  if (!latestByFilename[v.filename] || new Date(v.createdAt) > new Date(latestByFilename[v.filename].createdAt)) {
    latestByFilename[v.filename] = v;
  }
});

const videosToMigrate = Object.values(latestByFilename);

console.log(`\nMigrating ${videosToMigrate.length} videos to catalog:\n`);

// Convert to catalog Asset format
videosToMigrate.forEach(video => {
  const asset = {
    id: `asset_video_${Date.parse(video.createdAt)}_${video.id.split('_').pop()}`,
    type: 'video',
    filename: video.filename,
    url: video.url,
    provider: video.provider,
    model: video.model,
    prompt: video.prompt || `Transition video from ${video.startShot} to ${video.endShot}`,
    status: 'ready',
    createdAt: video.createdAt,
    completedAt: video.completedAt,
    estimatedCost: video.provider === 'kie' ? 0.25 : video.model === 'kling-o1' ? 0.56 : 0.15,
    generationTimeMs: video.completedAt ? Date.parse(video.completedAt) - Date.parse(video.createdAt) : 0,
    metadata: {
      startShot: video.startShot,
      endShot: video.endShot,
      duration: video.duration,
      migratedFrom: 'video-scenes',
    }
  };

  console.log(`  ✓ ${asset.filename} (${asset.provider}/${asset.model})`);
  catalog.assets.push(asset);
});

// Update catalog
catalog.lastUpdated = new Date().toISOString();

// Write updated catalog
writeFileSync(CATALOG_INDEX, JSON.stringify(catalog, null, 2));

console.log(`\n✅ Migration complete! Added ${videosToMigrate.length} videos to catalog.\n`);
