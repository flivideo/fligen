#!/bin/bash
# Test script for catalog API

echo "🧪 Testing Asset Catalog API"
echo ""

echo "1. Get all assets (should be empty):"
curl -s http://localhost:5401/api/catalog | jq
echo ""

echo "2. Manually adding a test asset to index.json..."
cat > /tmp/test-asset.json << 'EOF'
{
  "version": "1.0.0",
  "lastUpdated": "2026-01-04T06:00:00.000Z",
  "assets": [
    {
      "id": "asset_image_1735974000000_abc123",
      "type": "image",
      "filename": "image-1735974000000-fal-flux-pro.jpg",
      "url": "/assets/catalog/images/image-1735974000000-fal-flux-pro.jpg",
      "provider": "fal",
      "model": "Flux Pro v1.1",
      "prompt": "A beautiful sunset over mountains",
      "status": "ready",
      "createdAt": "2026-01-04T06:00:00.000Z",
      "completedAt": "2026-01-04T06:00:05.000Z",
      "estimatedCost": 0.04,
      "generationTimeMs": 5000,
      "metadata": {
        "width": 1024,
        "height": 1024,
        "seed": 42
      }
    }
  ]
}
EOF

cp /tmp/test-asset.json assets/catalog/index.json
echo "✅ Test asset added to catalog"
echo ""

echo "3. Get all assets (should show test asset):"
curl -s http://localhost:5401/api/catalog | jq
echo ""

echo "4. Filter by type=image:"
curl -s "http://localhost:5401/api/catalog/filter?type=image" | jq
echo ""

echo "5. Filter by provider=fal:"
curl -s "http://localhost:5401/api/catalog/filter?provider=fal" | jq
echo ""

echo "6. Get specific asset by ID:"
curl -s http://localhost:5401/api/catalog/asset_image_1735974000000_abc123 | jq
echo ""

echo "7. Get non-existent asset (should return 404):"
curl -s -w "\nHTTP Status: %{http_code}\n\n" http://localhost:5401/api/catalog/nonexistent-id | jq 2>/dev/null || echo ""

echo "🧹 Cleanup: Resetting catalog to empty state..."
cat > assets/catalog/index.json << 'EOF'
{
  "version": "1.0.0",
  "lastUpdated": "2026-01-04T05:39:30.478Z",
  "assets": []
}
EOF
echo "✅ Catalog reset"
