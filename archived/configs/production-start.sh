#!/bin/bash
set -e

echo "🏗️  Building production application..."
npm run build

echo "📦 Checking build files..."
if [ ! -f "dist/index.js" ]; then
    echo "❌ Build failed: dist/index.js not found"
    exit 1
fi

if [ ! -d "dist/public" ]; then
    echo "❌ Build failed: dist/public directory not found"
    exit 1
fi

echo "✅ Build successful"

echo "🚀 Starting production server..."
npm run start