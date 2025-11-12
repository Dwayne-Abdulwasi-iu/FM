Backup contents and restore steps

Files created on 2025-11-12 (example names):
- designs-2025-11-12T08-23-42.json.gz
- users-2025-11-12T08-23-42.json.gz
- notifications-2025-11-12T08-23-42.json.gz
- password_reset_tokens-2025-11-12T08-23-42.json.gz
- indexes-2025-11-12T08-29-50-140Z.json
- manifest-2025-11-12T08-27-42-112Z.json

What these files are
- *.json.gz — newline-delimited EJSON per-collection. Each line is an EJSON string produced by bson.EJSON.stringify(doc). This preserves ObjectId, Date, etc.
- indexes-*.json — captured index definitions for each collection (keys, unique, partialFilterExpression, collation).
- manifest-*.json — contains file sizes, SHA256 checksums, and document counts (if available).

Recommended long-term storage
- Upload the entire `backups/` directory to an offsite, encrypted, access-controlled object store (S3/GCS/Azure Blob) or to an external HDD.
- Keep at least two copies: one local (offline) and one remote in a separate region/account.

Upload examples (PowerShell)

AWS S3 (requires AWS CLI configured):

```powershell
# Upload entire backups directory
aws s3 cp .\backups s3://your-bucket-name/backups/ --recursive --acl private

# Verify files in S3
aws s3 ls s3://your-bucket-name/backups/
```

Google Cloud Storage (requires `gsutil`):

```powershell
# Copy entire backups folder to GCS
gsutil -m cp -r .\backups gs://your-bucket-name/backups/

# List
gsutil ls gs://your-bucket-name/backups/
```

Azure Blob (requires `az` CLI):

```powershell
# Create container and upload
az storage container create --name backups --account-name YOUR_ACCOUNT
az storage blob upload-batch --source .\backups --destination backups --account-name YOUR_ACCOUNT
```

Restore guidance
- Documents (per-collection): use `mongoimport` to import each file back into the target DB.
  - Example (PowerShell):

```powershell
# Import single collection file
mongoimport --uri="$env:DATABASE_URL" --collection users --file .\backups\users-2025-11-12T08-23-42.json.gz --gzip --jsonArray
```

Note: our exports are newline-delimited EJSON (not a single JSON array). If `mongoimport` fails with `--jsonArray`, instead use a small restore script that streams lines and inserts documents (I can provide one).

- Indexes: after importing documents, recreate indexes from `indexes-*.json`.
  - Example approach (Node.js snippet): read the indexes file and call `db.collection(index.name).createIndex(index.key, options)` for each index. I can provide a script to recreate indexes automatically.

Optional: create a BSON-level dump with `mongodump` for a full fidelity, restore-compatible backup (requires MongoDB Database Tools installed):

```powershell
# Install via scoop (example)
scoop install mongodb-database-tools

# Then create an archive
$ts = (Get-Date -Format yyyyMMdd-HHmmss)
mongodump --uri="$env:DATABASE_URL" --archive=".\backups\fashion_dev-$ts.gz" --gzip
```

Security notes
- Do not commit `backups/` to source control.
- Move backups to encrypted storage and remove local copies if not needed.
- Rotate and protect any credentials used to access storage.

If you want
- I can generate an automated `restore-indexes.mjs` script that reads `indexes-*.json` and recreates indexes.
- I can generate a streaming `mongoimport`-compatible restore script to import the newline-delimited EJSON files.
- I can prepare a PowerShell upload script for AWS/GCS/Azure you can run locally.

Tell me which of the above extras you'd like (restore script, indexes re-creator, or upload script).