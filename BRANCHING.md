# Branching And Promotion

This repository follows the environment lane used in the `.agent` infrastructure notes, adapted for a Chrome/Edge extension.

## Branches

| Branch       | Environment          | Purpose                            | Gate                                     |
| ------------ | -------------------- | ---------------------------------- | ---------------------------------------- |
| `codex/*`    | Preview              | Agent or feature work              | CI + smoke before PR review              |
| `dev`        | Dev                  | First integration lane             | Auto CI + packaged artifact              |
| `test`       | Test                 | QA lane for validation             | Auto CI + packaged artifact              |
| `staging`    | Staging              | Store-submission rehearsal         | CI + smoke, then manual review           |
| `production` | Production           | Release-ready source               | CI + smoke, then manual store submission |
| `main`       | Production candidate | Stable base branch / admin default | CI + smoke                               |

## Promotion Flow

1. Feature branches open PRs into `dev`.
2. Promote `dev` into `test` with a PR.
3. Promote `test` into `staging` with a PR.
4. Promote `staging` into `production` with a PR.
5. Submit the `production` artifact to Chrome Web Store and Edge Add-ons after manual review.

The extension store release is intentionally manual for now. Chrome and Edge store submission requires developer-account credentials, listing assets, privacy answers, and review timing that should not be hidden inside an unreviewed CI job.

## GitHub Environment Recommendations

Configure GitHub Environments named `dev`, `test`, `staging`, and `production`.

- `dev`: allow deployments from `dev`.
- `test`: allow deployments from `test`.
- `staging`: allow deployments from `staging`, require reviewer approval.
- `production`: allow deployments from `production`, require reviewer approval.

For branch protection, require the `test-build` and `browser-smoke` checks before merging into `dev`, `test`, `staging`, or `production`.
