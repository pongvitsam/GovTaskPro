# One-time GAS deploy setup (Windows PowerShell)
# Run from repo root: .\scripts\setup-gas-deploy.ps1

Write-Host "Step 1/3: Google clasp login (browser will open)..." -ForegroundColor Cyan
npx @google/clasp login
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$claspPath = Join-Path $env:USERPROFILE ".clasprc.json"
if (-not (Test-Path $claspPath)) {
  Write-Host "Error: $claspPath not found after login." -ForegroundColor Red
  exit 1
}

Write-Host "Step 2/3: Save credentials to GitHub secret CLASPRC_JSON..." -ForegroundColor Cyan
Get-Content $claspPath -Raw | gh secret set CLASPRC_JSON

Write-Host "Step 3/3: Deploy GAS now..." -ForegroundColor Cyan
npm run deploy

Write-Host "Done. Future pushes to main will auto-deploy via GitHub Actions." -ForegroundColor Green
