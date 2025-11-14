# Changelog — Index & Backup Work (2025-11-12)

- Created partial, case-insensitive unique index `username_ci_unique` on `users.username` to enforce case-insensitive uniqueness while excluding non-string/null usernames.
- Added server-side and client-side validation for `username` with pattern /^[A-Za-z0-9_-]{3,30}$/.
- Added scripts:
  - `scripts/scan-duplicate-usernames.mjs` — dry-run scanner for duplicate usernames
  - `scripts/resolve-duplicate-usernames.mjs` — resolver with `--apply` flag
  - `scripts/create-unique-username-index.mjs` — index creation script with `--partial` flag
  - `scripts/export-ejson.mjs`, `scripts/generate-backup-manifest.mjs`, `scripts/export-indexes.mjs` — backup/export tooling
  - `scripts/restore-ejson.mjs`, `scripts/restore-indexes.mjs` — restore tooling (idempotent)
  - `scripts/test-username-uniqueness.mjs` — smoke test for username uniqueness (used manually or in CI)
- Exported current DB as EJSON per-collection and generated manifest + `backups/indexes-*.json` (saved in `./backups`).
- Added `backups/indexes-report-*.json` summarizing created indexes.

Recommendations:
- Store `./backups` offsite (S3/GCS/Azure) with SSE and strict IAM.
- Rotate credentials if backups or upload credentials were used.
- Restore to staging to validate backups end-to-end.
- Add the smoke test to CI (workflow added at `.github/workflows/username-smoke-test.yml`).

## 2025-11-14 — Upload UX

- Added a dismissible, responsive banner to the upload page reminding sellers to "Upload an image or thumbnail first — required for faster review; designs without one may be rejected." The banner dismissal persists in `localStorage` under the key `uploadBannerDismissed` and includes a short 200ms fade/slide dismiss animation. (File: `src/app/upload/page.tsx`)
- Lint and tests verified locally: `npm run lint` clean, `npx jest` passes (29 passed, 2 skipped).
