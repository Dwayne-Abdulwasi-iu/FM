# Git history purge plan (safe procedure)

This document explains a safe approach to remove secrets from git history using a mirror clone and `git-filter-repo` or BFG.

IMPORTANT: This rewrites history and requires coordination: every collaborator must re-clone after the force-push.

Steps (recommended):

1. Backup current repo (local mirror):

```bash
# run outside your working repo
git clone --mirror https://github.com/<owner>/<repo>.git repo-mirror.git
cd repo-mirror.git
```

2. Install git-filter-repo (recommended over BFG):

- On macOS / Linux: follow https://github.com/newren/git-filter-repo
- On Windows: use the official instructions, or run in WSL

3. Prepare a file `to-purge.txt` listing sensitive patterns or file paths (one per line):

```
.env.render
.env.local
.env
# other files that contained secrets
```

4. Run git-filter-repo to remove files from history:

```bash
# Example: remove specific files
git filter-repo --invert-paths --paths-from-file ../to-purge.txt

# OR remove any commit content matching a regex (advanced)
# git filter-repo --replace-text replacements.txt
```

5. Verify the repo locally. Inspect commits, run `git log --stat`, and run secrets scanner.

6. Force-push the cleaned mirror to GitHub (BE CAREFUL):

```bash
git remote set-url origin https://github.com/<owner>/<repo>.git
git push --force --all
git push --force --tags
```

7. Communicate with collaborators: instruct everyone to re-clone the repo (do NOT pull). Share the exact time and reason.

8. Rotate any secrets that were exposed (create new passwords/keys) and update CI secrets.

Alternative: BFG Repo-Cleaner (simpler but older): https://rtyley.github.io/bfg-repo-cleaner/

If you want, I can generate a concrete `to-purge.txt` and the exact `git-filter-repo` commands tailored to the files we found. I will not run the destructive purge unless you explicitly confirm and coordinate.
