#!/usr/bin/env bash
# Upload ./backups to S3. Replace BUCKET and AWS_PROFILE before running.
set -euo pipefail
BUCKET="your-bucket-name"
PREFIX="backups/$(date -u +%Y-%m-%dT%H-%M-%SZ)"
# Example: export AWS_PROFILE=your-profile
aws s3 cp ./backups "s3://$BUCKET/$PREFIX" --recursive --sse AES256 --acl private
# After upload, verify checksums using the manifest in backups/manifest-*.json
