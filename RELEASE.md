# Releasing

Releases are automated by `.github/workflows/release.yml`.

When a conventional commit lands on `master`, CI:

1. Runs lint, type-check, build, and tests.
2. Invokes `commit-and-tag-version`, which bumps the version in `package.json`, writes an entry in `CHANGELOG.md`, and creates an annotated git tag based on the commit types (`feat` → minor, `fix` → patch, `BREAKING CHANGE` footer → major).
3. Pushes the release commit and tag back to `master`.
4. Publishes to npm with `--provenance` using OIDC trusted publishing (no secrets required once the trusted publisher is configured for this repo on npmjs.com).

If there are no release-worthy commits since the last tag (only `chore:`, `style:`, `test:`, etc.), the workflow is a no-op.

## One-off commands

Run locally if needed (pushes are done by CI):

```bash
bunx commit-and-tag-version --dry-run          # preview the next release
bunx commit-and-tag-version --release-as major # force a major bump
```

## Initial npm setup

Before the first automated release runs, configure the npm Trusted Publisher for the `squel` package:

1. Go to the package settings on npmjs.com: **Settings → Trusted Publisher → GitHub Actions**.
2. Set: organization `hiddentao`, repository `squel`, workflow filename `release.yml`.
3. Save. Subsequent `npm publish --provenance` calls from this workflow will authenticate via OIDC.
