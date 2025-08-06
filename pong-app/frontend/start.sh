#!/bin/bash

set -e  # Exit on error

cd "$(dirname "$0")"
echo "📁 In project directory: $(pwd)"

NEED_INSTALL=false

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

# --- Build and Run ---
echo "🛠️ Building the project..."
npm run build

echo "📂 Listing dist directory..."
ls -a dist/

echo "Removing dist directory..."
rm -rf dist

echo "🏃 Starting the server..."
npm run dev
