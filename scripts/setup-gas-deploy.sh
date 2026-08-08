#!/usr/bin/env bash
# One-time GAS deploy setup (macOS/Linux)
# Run from repo root: bash scripts/setup-gas-deploy.sh

set -euo pipefail

echo "Step 1/3: Google clasp login (browser will open)..."
npx @google/clasp login

if [ ! -f "$HOME/.clasprc.json" ]; then
  echo "Error: ~/.clasprc.json not found after login." >&2
  exit 1
fi

echo "Step 2/3: Save credentials to GitHub secret CLASPRC_JSON..."
cat "$HOME/.clasprc.json" | gh secret set CLASPRC_JSON

echo "Step 3/3: Deploy GAS now..."
npm run deploy

echo "Done. Future pushes to main will auto-deploy via GitHub Actions."
