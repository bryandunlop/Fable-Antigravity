---
description: How to use Git branching for all development work on this project
---

# Git Branching Workflow

This project uses `main` as the single source of truth. All work must be done on feature branches and merged into `main` via a commit. Never commit directly to `main`.

## Starting New Work

1. Make sure you are on `main` and it is up to date:
```bash
git checkout main
git pull origin main
```

2. Create a feature branch with a descriptive name:
```bash
# Use one of these prefixes:
git checkout -b feat/your-feature-name    # new features
git checkout -b fix/your-bug-description  # bug fixes
git checkout -b chore/task-description    # maintenance, cleanup, config
```

Examples:
- `feat/waiver-submission-form`
- `fix/nav-links-broken`
- `chore/update-dependencies`

## During Development

3. Commit frequently as you work — small commits are better than one huge one:
```bash
git add .
git commit -m "feat: add waiver request form with approval chain"
```

4. Push the branch to GitHub regularly (protects against local data loss):
```bash
git push origin feat/your-feature-name
```

## Finishing Work

5. When the feature is complete, merge into `main`:
```bash
git checkout main
git merge feat/your-feature-name
git push origin main
```

6. Delete the feature branch after merging:
```bash
git branch -d feat/your-feature-name
git push origin --delete feat/your-feature-name
```

## Key Rules

- **Never commit directly to `main`**
- **Always push your branch to GitHub** before ending a session — this protects against lost work
- **One branch per feature** — don't pile unrelated changes into one branch
- **`main` must always be deployable** — don't merge broken code
