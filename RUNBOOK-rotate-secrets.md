# Runbook: Rotate Secrets and Purge Git History

This runbook lists step-by-step actions to rotate compromised/committed secrets and to safely purge them from Git history.

Important: these operations are destructive to repository history. Coordinate with your team and back up the repository before running history-rewrite commands.

1) Immediate rotation (manual; do these first)
  - SendGrid
    - Log in to the SendGrid UI → Settings → API Keys
    - Revoke the exposed key(s) and create a new key with the minimum required scopes (Mail Send).
    - Update your local `.env.local` and deployment provider (Vercel/Render) secrets with the new key.

  - Paystack / Stripe / Other payment keys
    - Revoke or rotate keys in their dashboards.
    - Update deployment secrets.

  - Sentry
    - Revoke any leaked auth tokens.
    - Create a new auth token with `project:write` and `org:read` for CI release uploads.

  - Database (MongoDB Atlas)
    - In Atlas, create a new DB user with a strong password and the same roles.
    - Update your `DATABASE_URL` in `.env.local` and in deployments.
    - Once confirmed working, revoke the old DB user's credentials.

2) Purge secrets from Git history (optional but recommended if secrets were committed publicly)

  - Option A (git-filter-repo) — recommended and fast
    - Install: https://github.com/newren/git-filter-repo
    - Example command to remove a key or filename:

      ```bash
      # Backup current repo first (clone a fresh copy)
      git clone --mirror https://github.com/your/repo.git repo-mirror.git
      cd repo-mirror.git

      # Remove all occurrences of a string (e.g., an API key)
      git filter-repo --replace-text <(printf 'OLD_SENDGRID_KEY==>REDACTED')

      # Or remove files entirely
      git filter-repo --invert-paths --path .env

      # Push the rewritten history back (force push)
      git push --force --all
      git push --force --tags
      ```

  - Option B (BFG Repo-Cleaner)
    - Install BFG: https://rtyley.github.io/bfg-repo-cleaner/
    - Example:
      ```bash
      git clone --mirror git@github.com:your/repo.git
      java -jar bfg.jar --replace-text replacements.txt repo.git
      cd repo.git
      git reflog expire --expire=now --all && git gc --prune=now --aggressive
      git push --force
      ```

3) After history rewrite
  - Invalidate any cached deploys or CI artifacts that may contain secrets.
  - Rotate any keys again if there's any doubt they were exposed externally (defense-in-depth).
  - Notify team members that they'll need to re-clone the repo (history rewrite requires fresh clones).

4) CI / Deploy secrets
  - Update the environment variables in your hosting provider (Vercel/Render/Azure) to the new secrets.
  - Do not store secrets in repository files; use the provider's secret store.

5) Validate everything
  - Restart the application in each environment and run smoke tests (email send, DB connection, login flows).

6) Optional: Add secret scanning
  - Enable GitHub Advanced Security or a third-party scanner (e.g., GitGuardian, TruffleHog) to detect future leaks.

Notes & Safety
  - Never share your new keys in chat or commit them to the repository.
  - Keep a secure copy of the rotation steps and credential changes in a secrets manager (1Password, Vault, Keyvault).
