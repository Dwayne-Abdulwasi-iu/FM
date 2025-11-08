# Migrations & Production DB safety

This project uses Prisma for schema modeling (MongoDB provider) and `migrate-mongo` for production-safe, versioned migrations because Prisma Migrate does not support MongoDB for `prisma migrate`.

Follow these steps when applying schema changes to a production MongoDB (Atlas) cluster.

## 1) Create a backup / snapshot (required before production changes)

Recommended: use MongoDB Atlas UI to create a snapshot/backup. Steps:

1. Sign in to MongoDB Atlas
2. Select your project and cluster
3. Click "Backups" (or "Snapshots") in the left menu
4. Create a snapshot (on-demand) and wait for it to complete
5. Note the snapshot ID and keep it until the migration has been verified

Optional (CLI) using `mongodump` (requires network access to the cluster):

```powershell
# Dump the database to a local folder (replace placeholders)
mongodump --uri="mongodb+srv://USER:PASS@cluster0.as7yeiu.mongodb.net/fashion_prod" --archive=backup.gz --gzip
```

Restore example (only when necessary):

```powershell
mongorestore --uri="mongodb+srv://USER:PASS@cluster0.as7yeiu.mongodb.net/fashion_prod" --archive=backup.gz --gzip --drop
```

Always verify the backup completed successfully before continuing.

## 2) Create migration files locally (already done)

We use `migrate-mongo` (see `migrate-mongo-config.js` and `migrations/`). To create a migration locally:

```powershell
npx migrate-mongo create add-password-reset-token
# edit the created file under migrations/ to implement up/down
```

The repository already contains a migration that creates the `password_reset_tokens` collection and indexes. It was created and committed as a versioned migration file in `migrations/`.

## 3) Test migration against a staging/dev DB

1. Create a staging database (or use a local dev DB)
2. Set environment variables:

```powershell
$env:DATABASE_URL = 'mongodb+srv://USER:PASS@cluster0.as7yeiu.mongodb.net/fashion_staging'
$env:MIGRATE_MONGO_DB_NAME = 'fashion_staging' # optional
npx migrate-mongo up
```

Confirm the migration applied and indexes exist.

## 4) Apply migration to production (safe procedure)

1. Create a production backup / snapshot (see step 1).
2. Put your service into maintenance mode (stop writes if possible).
3. On the production host (or CI job) ensure the following env vars are set:

- `DATABASE_URL` — full MongoDB connection string (mongodb+srv://...)
- `MIGRATE_MONGO_DB_NAME` — optional, if needed

4. Run the migration on the production host (or in a controlled CI job):

```powershell
npx migrate-mongo up
```

5. Verify the migration succeeded and application behavior (e.g., forgot-password) works.
6. If anything goes wrong, restore from the snapshot and investigate.

## 5) Notes & troubleshooting

- `prisma migrate` is not supported for MongoDB; do not use it for production migrations in this project.
- `migrate-mongo` stores applied migration versions in the `changelog` collection (configurable).
- The migration file in this repo creates a TTL index on `expiresAt` for the `password_reset_tokens` collection so tokens auto-expire.

If you want, I can prepare a small CI job (GitHub Actions) that runs `npx migrate-mongo up` in a protected workflow using repository secrets and only triggers on tagged releases. Ask and I'll add it.
