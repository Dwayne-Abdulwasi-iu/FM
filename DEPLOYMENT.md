# Deployment & Environment Variable Checklist

This document explains how to safely rotate secrets, update environment variables in CI and Render, and perform a controlled redeploy. Follow these steps when you rotate credentials (MongoDB user, SendGrid API key, Paystack keys, etc.) or change critical runtime configuration.

## Goals
- Prevent downtime when rotating credentials.
- Ensure secrets are never committed to Git.
- Provide a small smoke-test checklist to verify endpoints after redeploy.

## Quick summary (one-line)
1. Rotate credentials in the provider (Atlas/SendGrid/Paystack). 2. Update secret values in Render and GitHub Actions (if used). 3. Redeploy, run smoke tests, monitor logs. 4. Roll back if necessary.

## Secrets to rotate / update
- `DATABASE_URL` (MongoDB Atlas SRV string)
- `NEXTAUTH_SECRET`
- `SENDGRID_API_KEY` (or SMTP credentials)
- `EMAIL_FROM` (the verified sender address used by SendGrid)
- `PAYSTACK_SECRET_KEY` and `PAYSTACK_PUBLIC_KEY`
- `SENTRY_DSN` (optional)

Note: Do NOT store real secrets in the repository. Use `.env.local` locally (gitignored) or your host's secret manager.

## GitHub Actions (CI)

- The repository's CI (`.github/workflows/ci.yml`) uses placeholder environment variables for the build step. It does not currently depend on production secrets.
- If you add deployment steps that run against production, add the necessary secrets in the repository settings: Settings → Secrets and variables → Actions → New repository secret.

Recommended secret names for GitHub Actions (use the same names in Render to avoid confusion):
- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `SENDGRID_API_KEY`
- `EMAIL_FROM`
- `PAYSTACK_SECRET_KEY`
- `PAYSTACK_PUBLIC_KEY`

How to add a secret in GitHub Actions:
1. Go to your repository on GitHub.
2. Settings → Secrets and variables → Actions → New repository secret.
3. Fill `Name` and `Value` and save.

If you need a deployment job that references these secrets, reference them from the workflow as `${{ secrets.DATABASE_URL }}` etc.

## Render (or other host) environment variables

On Render (replace with Vercel/Heroku steps if you use them):
1. Open the Render service where your app is hosted.
2. Go to `Environment` or `Environment > Environment Variables`.
3. Add/update the secret keys below (exact names recommended):
   - `DATABASE_URL` = mongodb+srv://<USER>:<PASSWORD>@.../fashion_prod?retryWrites=true&w=majority
   - `NEXTAUTH_URL` = https://your-production-domain.com
   - `NEXTAUTH_SECRET` = <long-random-secret>
   - `SENDGRID_API_KEY` = SG.xxxxx
   - `EMAIL_FROM` = verified-sender@yourdomain.com
   - `PAYSTACK_SECRET_KEY` and `PAYSTACK_PUBLIC_KEY`
   - `SENTRY_DSN` = (if using Sentry)

4. Save the environment variables and trigger a redeploy (either via the Render UI or push a new commit).

Notes for Render users:
- Render requires the variable names exactly as your app expects them.
- Avoid using PowerShell-style `$env:FOO` names in the app or `.env` files — use plain `FOO=bar` names.

## MongoDB Atlas — rotate DB user password (recommended when creds exposed)
1. In Atlas console → Database Access → Edit the database user used by the app.
2. Reset its password, or create a new user with the same roles (usually `readWrite` on the app DB).
3. Copy the new connection string (SRV) and update `DATABASE_URL` in Render and GitHub secrets.
4. Optional: restrict network access (IP whitelist) or enable private endpoint for production for better security.

Connection string example (SRV):
```
mongodb+srv://app_user:NEW_PASSWORD@cluster0.as7yeiu.mongodb.net/fashion_prod?retryWrites=true&w=majority
```

## SendGrid — verify sender & rotate API keys
1. Revoke any exposed API keys in the SendGrid UI immediately.
2. Create a new API key with Mail Send permission.
3. For testing, use Single Sender Verification (Settings → Sender Authentication → Single Sender Verification) and verify the `EMAIL_FROM` address.
4. For production, perform Domain Authentication (recommended): add the DNS records SendGrid provides to Cloudflare and complete verification.
5. Update `SENDGRID_API_KEY` and `EMAIL_FROM` in Render and GitHub secrets.

## Safe redeploy checklist (small)
1. [Optional but strongly recommended] Take a snapshot/backup of your production DB (Atlas snapshot).
2. Rotate secrets in provider UIs (MongoDB user, SendGrid key, Paystack key) if necessary.
3. Update the runtime secrets in Render and in GitHub (if your deployment uses them).
4. If you have DB schema migrations (migrate-mongo), run them from a controlled environment that has network access to the DB and uses the new `DATABASE_URL` (CI or a maintainer machine):

```powershell
# Example (install migrate-mongo globally or via npx):
# set the DB url in your shell session (PowerShell):
$env:DATABASE_URL = 'mongodb+srv://app_user:NEW_PASSWORD@cluster0.as7yeiu.mongodb.net/fashion_prod?retryWrites=true&w=majority'
npx migrate-mongo up
```

5. Trigger a service restart / redeploy (Render UI or git push).
6. Run smoke tests:
   - `node ./scripts/test-db-conn.js` — checks SRV/DNS/TCP reachability.
   - Run the small auth test (quick connectivity + auth check):

```powershell
$env:DATABASE_URL = 'mongodb+srv://app_user:NEW_PASSWORD@cluster0.as7yeiu.mongodb.net/fashion_prod?retryWrites=true&w=majority'
node -e "const { MongoClient } = require('mongodb'); (async ()=>{ try{ const c=new MongoClient(process.env.DATABASE_URL); await c.connect(); console.log('AUTH OK'); await c.close(); } catch(e){ console.error('AUTH ERROR'); console.error(e); process.exit(1);} })()"
```

   - `node ./scripts/test-sendgrid-api.js recipient@example.com` — verify SendGrid returns 202 after `EMAIL_FROM` is verified.
   - Hit app endpoints that depend on DB: `/api/favorites`, `/api/cart`, `/api/notifications` (or use curl to exercise them).

7. Watch logs for errors (Render logs or your host logs) for 5–10 minutes to confirm traffic is healthy.

## Rollback plan
- If the redeploy causes regressions and you need to rollback quickly:
  1. Revert the commit you pushed (or redeploy the previous release in Render).
  2. Restore the previous `DATABASE_URL` if you changed it (only if you rotated the password as part of the change and you have the previous credentials still valid).
  3. Use your DB snapshot if any destructive migration accidentally ran (restore from Atlas snapshot).

## Post-rotation housekeeping
- Ensure your `.env` is not tracked by Git and your repository's history does not contain live secrets. If secrets were committed earlier, plan a history purge (git-filter-repo or BFG) and rotate the secrets again after purge.
- Keep a short change log for the rotation event in your release notes (what was rotated, who approved, when).

## Common troubleshooting
- SCRAM / Authentication errors: usually an incorrect username/password in `DATABASE_URL`. Rotate password and update runtime env vars.
- SendGrid 403 about `from` address: verify `EMAIL_FROM` as a Single Sender or complete Domain Authentication.
- SMTP 535: SMTP credentials invalid or SMTP permissions missing.

---

If you'd like, I can also:
- Produce exact GitHub Actions steps to run `migrate-mongo` in CI against a staging DB.
- Generate `render.yaml` or a step-by-step script to automate the secret update (requires Render API key).

If you want me to proceed with one of those, tell me which and I will prepare the next edits.
