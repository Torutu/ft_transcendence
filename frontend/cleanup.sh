#!/bin/bash

set -e

cd "$(dirname "$0")"
echo "🧹 Cleaning up generated files..."

DRY_RUN=false

# Parse arguments
if [[ "$1" == "--dry-run" ]]; then
  DRY_RUN=true
  echo "🔍 Dry run mode enabled — no files will be deleted"
fi

# Helper function to prompt and delete
delete_with_prompt() {
  local path="$1"

  if [[ ! -e "$path" ]]; then return; fi

  if $DRY_RUN; then
    echo "🗒️  [dry-run] Would remove: $path"
    return
  fi

  read -p "❓ Delete '$path'? [y/N] " confirm
  if [[ "$confirm" == "y" || "$confirm" == "Y" ]]; then
    rm -rf "$path"
    echo "✅ Removed: $path"
  else
    echo "⏭️  Skipped: $path"
  fi
}

# Paths to potentially remove
delete_with_prompt "node_modules"
delete_with_prompt "dist"

echo "🏁 Cleanup finished."
