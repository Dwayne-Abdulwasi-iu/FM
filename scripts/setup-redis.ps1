#!/usr/bin/env pwsh
<#
  setup-redis.ps1
  - Prompts for Redis password (optional)
  - Starts a local Redis container via docker-compose.redis.yml
  - Writes or updates REDIS_URL in .env.local

  Usage: Run from repo root in PowerShell / pwsh:
    .\scripts\setup-redis.ps1
#>

param()

function Write-EnvLine($path, $key, $value) {
  if (-not (Test-Path $path)) { New-Item -Path $path -ItemType File -Force | Out-Null }
  $content = Get-Content $path -Raw
  $line = "$key=`"$value`""
  if ($content -match "(?m)^$key=.*$") {
    # replace existing
    $new = [regex]::Replace($content, "(?m)^$key=.*$", $line)
    Set-Content -Path $path -Value $new
  } else {
    Add-Content -Path $path -Value "$line"
  }
}

Write-Host "This script will start a local Redis container and add REDIS_URL to .env.local (or update it)." -ForegroundColor Cyan

$pwd = Read-Host "Enter a password for Redis (leave empty for no password). If you set a password, clients must use it"
if ($pwd -ne "") {
  Write-Host "Will start Redis with AUTH enabled (password set)." -ForegroundColor Yellow
} else {
  Write-Host "Will start Redis without AUTH (no password)." -ForegroundColor Yellow
}

Write-Host "Starting Redis via docker-compose..." -ForegroundColor Green
docker compose -f docker-compose.redis.yml up -d
if ($LASTEXITCODE -ne 0) {
  Write-Host "docker compose failed. Make sure Docker is running and you have permissions." -ForegroundColor Red
  exit 1
}

# If password set, configure container with requirepass using redis-cli
if ($pwd -ne "") {
  Write-Host "Configuring Redis requirepass inside container..." -ForegroundColor Green
  # copy temp conf to container and restart with requirepass
  $cid = (docker ps -q -f "ancestor=redis:7" | Select-Object -First 1)
  if (-not $cid) { Write-Host "Redis container not found" -ForegroundColor Red; exit 1 }
  # set the password using redis-cli CONFIG SET requirepass
  docker exec -i $cid redis-cli CONFIG SET requirepass $pwd | Out-Null
}

if ($pwd -ne "") {
  $redisUrl = "redis://:$pwd@localhost:6379"
} else {
  $redisUrl = "redis://localhost:6379"
}

$envPath = Join-Path -Path (Get-Location) -ChildPath '.env.local'
Write-Host "Writing REDIS_URL to $envPath" -ForegroundColor Green
Write-EnvLine -path $envPath -key 'REDIS_URL' -value $redisUrl

Write-Host "Done. REDIS_URL=$redisUrl" -ForegroundColor Cyan
Write-Host "Tip: open .env.local to confirm and restart your dev server if needed." -ForegroundColor Gray
