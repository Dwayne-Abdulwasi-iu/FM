#!/usr/bin/env bash
# Upload ./backups to a GCS bucket. Replace BUCKET before running.
set -euo pipefail
BUCKET="your-gcs-bucket"
PREFIX="backups/$(date -u +%Y-%m-%dT%H-%M-%SZ)"
gsutil -m cp -r ./backups "gs://$BUCKET/$PREFIX/"
# Consider enabling CMEK or customer-supplied encryption if required.
