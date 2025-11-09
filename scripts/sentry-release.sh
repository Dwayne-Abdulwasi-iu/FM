#!/usr/bin/env bash
set -euo pipefail

# Local helper to create a Sentry release and upload Next.js sourcemaps.
# Requires: sentry-cli in PATH and the environment variables:
#   SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT
# Optionally set RELEASE (defaults to short git SHA)

if [ -z "${SENTRY_AUTH_TOKEN:-}" ]; then
  echo "SENTRY_AUTH_TOKEN is not set. Create a token in Sentry and export it:"
  echo "  export SENTRY_AUTH_TOKEN=<token>"
  exit 1
fi
if [ -z "${SENTRY_ORG:-}" ] || [ -z "${SENTRY_PROJECT:-}" ]; then
  echo "SENTRY_ORG or SENTRY_PROJECT not set. Set them, e.g.:"
  echo "  export SENTRY_ORG=my-org"
  echo "  export SENTRY_PROJECT=my-project"
  exit 1
fi

RELEASE=${RELEASE:-$(git rev-parse --short HEAD)}

echo "Building Next to generate sourcemaps..."
npm ci
npm run build

echo "Creating Sentry release: $RELEASE"
sentry-cli releases new "$RELEASE"
sentry-cli releases set-commits --auto "$RELEASE" || true

echo "Uploading sourcemaps from .next"
# Upload maps; adjust --url-prefix if you serve assets from a different path
sentry-cli releases files "$RELEASE" upload-sourcemaps .next --url-prefix "~/_next" --validate

echo "Finalizing release"
sentry-cli releases finalize "$RELEASE"

echo "Sentry release $RELEASE created and sourcemaps uploaded."
echo "Remember to set this RELEASE in your deploys so Sentry maps events to this release."
