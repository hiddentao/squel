# Contributing to squel

Thanks for your interest in contributing!

## Contributor license agreement

By submitting code as an individual or as an entity you agree that your code is [licensed the same as squel](README.md).

## Issues and pull requests

Issues and merge requests should be in English and contain appropriate language for audiences of all ages.

Before submitting a pull request, make sure:

- All checks pass locally: `bun run check`, `bun run typecheck`, `bun test`, `bun run build`.
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/). The `commit-msg` hook enforces this via commitlint. Examples:
  - `feat: add support for CTE in postgres select`
  - `fix: escape single quotes in default mssql options`
  - `docs: clarify useFlavour behaviour`
- Each PR fixes one issue or implements one feature. Split unrelated changes into separate PRs.
- Tests accompany the change (unless it's a test itself demonstrating a bug).
- The PR doesn't break existing functionality or change the public API without a `BREAKING CHANGE` footer in the commit.

## Development setup

```bash
bun install          # install dependencies
bun run check        # lint/format check (biome)
bun run typecheck    # TypeScript type checking
bun test             # run the test suite
bun run build        # produce dist/esm, dist/cjs, dist/types, dist/browser
```

The test suite runs against the TypeScript source directly &mdash; no need to build before running tests.

## Release process

Releases are fully automated from `master`. See [`RELEASE.md`](RELEASE.md) for details.
