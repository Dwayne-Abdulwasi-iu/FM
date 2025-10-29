# Security and Secret Remediation

This repository had an environment file containing a MongoDB Atlas URL. To reduce risk immediately we've untracked the env files and scrubbed the tracked copies. This document explains the recommended remediation steps, provides commands to purge history if required, and shows how to test new credentials safely.

## Immediate actions (you must run these)

1. Rotate the exposed credentials **now**.
   - In MongoDB Atlas: go to **Database Access** → **Add New Database User**. Create a new user with a strong password and limited privileges (prefer `readWrite` on the app database only).
   - Test the new credentials locally (see "Testing new credentials" below).
   - Update all deployed services (Vercel, Render, CI secrets, etc.) to use the new credentials.
   - Delete or rotate the old user after you confirm everything works with the new user.

2. Do not re-commit secrets to the repository. Keep any `.env.local` files in your local workspace and ensure they are listed in `.gitignore` (already configured).

## Testing new credentials locally (safe)

- PowerShell (per-session):
  ```powershell
  $env:DATABASE_URL = 'mongodb+srv://NEW_USER:NEW_PASS@<cluster>.mongodb.net/fashion?appName=Cluster0'
  npm run test:mongo
  ```

- Bash / zsh:
  ```bash
  export DATABASE_URL='mongodb+srv://NEW_USER:NEW_PASS@<cluster>.mongodb.net/fashion?appName=Cluster0'
  npm run test:mongo
  ```

`npm run test:mongo` will run the repository's env-checker and the Prisma test script. It does not write secrets to disk.

## Add secrets to CI (GitHub Actions)

1. Go to your repository → Settings → Secrets and variables → Actions → New repository secret.
2. Add a secret named `MONGO_DB_URL` with the value of your new connection string (include the database name in the URL).
3. Use the manual `MongoDB Test` workflow or update other workflows to reference `${{ secrets.MONGO_DB_URL }}`.

## Purging secrets from Git history (advanced, destructive)

If confidential values were committed in past commits, removing them from the current branch is not enough — the secret still exists in history. Purging history rewrites commits and requires coordination with collaborators.

Warning: history rewrite is disruptive. Only do this if you understand the implications and after rotating the exposed credentials.

Recommended (git-filter-repo):

```bash
# 1) Create a fresh mirror clone (outside your main repo)
git clone --mirror https://github.com/your/repo.git repo-mirror.git
cd repo-mirror.git

# 2) Remove files from history
git filter-repo --invert-paths --path .env.render --path .env.local

# 3) Push rewritten history
git push --force
```

Alternative (BFG):

```bash
git clone --mirror https://github.com/your/repo.git repo-mirror.git
cd repo-mirror.git
bfg --delete-files .env.render
bfg --delete-files .env.local
git reflog expire --expire=now --all && git gc --prune=now --aggressive
git push --force
```

After a purge, ask all collaborators to re-clone the repository.

## Coordinator notice (copy/paste)

When you perform a history rewrite, notify your team with this message:

```
We rotated exposed credentials and purged sensitive files from git history.
You must re-clone the repository to avoid merge conflicts. Steps:
1. Backup your current work.
2. git clone https://github.com/your/repo.git
3. Re-apply any in-progress local changes to the new clone.
```

## Non-destructive helper: secret scanner

There is a helper script at `scripts/scan-secrets.js` you can run locally to search the repository for common secret patterns. It is non-destructive and prints a report.

If you'd like, I can prepare a targeted history purge and helper commands and run them after you confirm and coordinate with your team. I will not rewrite history without your explicit approval.
