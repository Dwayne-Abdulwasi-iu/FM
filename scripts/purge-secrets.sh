#!/usr/bin/env bash
# Helper script: shows commands to purge secrets from git history using git-filter-repo or BFG
# This script does not execute destructive commands by default; review before running.

echo "This helper prints commands to purge secrets from git history. Review before running."

cat <<'EOF'
# Example: remove a specific file (e.g. .env) from history using git-filter-repo
git clone --mirror git@github.com:your-org/your-repo.git repo-mirror.git
cd repo-mirror.git
git filter-repo --invert-paths --path .env
git push --force --all
git push --force --tags

# Example: replace a string (an API key) with REDACTED
git clone --mirror git@github.com:your-org/your-repo.git repo-mirror.git
cd repo-mirror.git
git filter-repo --replace-text <(printf 'OLD_SENDGRID_KEY==>REDACTED')
git push --force --all
git push --force --tags

# BFG alternative (faster for large repos): https://rtyley.github.io/bfg-repo-cleaner/
EOF

echo "DONE - read above and run the commands intentionally from a mirrored clone."
