#!/bin/bash

set -e  # Exit on error

cd "$(dirname "$0")"
echo "📁 In project directory: $(pwd)"

NEED_INSTALL=false
NEED_PRISMA=false

# --- Check for dependency changes ---
if git status --porcelain | grep -E '^\s*M\s+(package(-lock)?\.json)' > /dev/null; then
  echo "📦 Detected changes in package.json or package-lock.json"
  NEED_INSTALL=true
fi

if [[ -d node_modules ]]; then
  if [ -z "$(ls -A node_modules)" ]; then
    echo "🚫 node_modules is empty — removing and reinstalling..."
    rm -rf node_modules
    NEED_INSTALL=true
  fi
else
  echo "📦 node_modules directory not found — will install dependencies"
  NEED_INSTALL=true
fi

if $NEED_INSTALL; then
  echo "📦 Running npm install..."
  npm install
else
  echo "✅ Skipping npm install — dependencies appear up-to-date"
fi

# --- Check for Prisma needs ---
if git status --porcelain | grep -E '^\s*M\s+prisma/schema\.prisma' > /dev/null; then
  echo "🧬 Detected changes in Prisma schema"
  NEED_PRISMA=true
fi

if [[ ! -d node_modules/.prisma ]]; then
  echo "⚠️ Prisma client not found — forcing generation"
  NEED_PRISMA=true
fi

if [[ ! -f prisma/dev.db ]]; then
  echo "❌ prisma/dev.db not found — migration needed"
  NEED_PRISMA=true
fi

# --- Run Prisma if needed ---
if $NEED_PRISMA; then
  echo "🔧 Running 'npx prisma generate'..."
  npx prisma generate

  echo "🚀 Running 'npx prisma migrate deploy'..."
  npx prisma migrate deploy
else
  echo "✅ Skipping Prisma — no schema changes, client exists, and DB is present"
fi

# --- Build and Run ---
echo "🛠️ Building the project..."
npm run build

echo "📂 Listing dist directory..."
ls -a dist/

echo "🏃 Starting the server..."
npx tsx src/index.ts
