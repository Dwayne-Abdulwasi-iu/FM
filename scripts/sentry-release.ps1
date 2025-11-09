Param(
  [string]$Release = $(git rev-parse --short HEAD)
)

if (-not $env:SENTRY_AUTH_TOKEN) {
  Write-Error "SENTRY_AUTH_TOKEN is not set. Create a token in Sentry and set the environment variable:`n  $env:SENTRY_AUTH_TOKEN = '<token>'"
  exit 1
}
if (-not $env:SENTRY_ORG -or -not $env:SENTRY_PROJECT) {
  Write-Error "SENTRY_ORG or SENTRY_PROJECT not set. Set them in the shell first:`n  $env:SENTRY_ORG='my-org'; $env:SENTRY_PROJECT='my-project'"
  exit 1
}

Write-Host "Building Next..."
npm ci
npm run build

Write-Host "Creating Sentry release: $Release"
sentry-cli releases new $Release
sentry-cli releases set-commits --auto $Release || Write-Host "set-commits failed (non-fatal)"

Write-Host "Uploading sourcemaps from .next"
sentry-cli releases files $Release upload-sourcemaps .next --url-prefix "~/_next" --validate

Write-Host "Finalizing release"
sentry-cli releases finalize $Release

Write-Host "Sentry release $Release created and sourcemaps uploaded."