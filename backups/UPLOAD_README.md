Upload checklist

1. Choose provider: S3/GCS/Azure. Use the appropriate upload script in this folder.
2. Ensure CLI auth is configured locally (aws configure, gcloud auth, az login).
3. Run upload script (edit BUCKET/ACCOUNT names as needed). Example:

   PowerShell:
   $env:AWS_PROFILE='your-profile'
   .\upload-to-s3.sh

4. After upload: verify `backups/manifest-*.json` checksums against remote objects.
5. Rotate credentials used for the upload and restrict access to the backup bucket.

Security notes
- Backups may contain secrets. Do not store them in publicly accessible buckets.
- Use SSE (AES256) or provider-managed encryption. For additional control, use a customer-managed key (KMS).
