#!/usr/bin/env bash
# Upload ./backups to Azure Blob Storage. Replace STORAGE_ACCOUNT, CONTAINER and SAS before running.
set -euo pipefail
STORAGE_ACCOUNT="youraccount"
CONTAINER="backups"
PREFIX="$(date -u +%Y-%m-%dT%H-%M-%SZ)"
# Using az CLI
az storage blob upload-batch --account-name "$STORAGE_ACCOUNT" -s ./backups -d "$CONTAINER/$PREFIX" --auth-mode login
