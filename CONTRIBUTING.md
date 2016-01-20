# Contribute to Squel

This guide guidelines for those wishing to contribute to Squel.

## Contributor license agreement

By submitting code as an individual or as an entity you agree that your code is [licensed the same as Squel](README.md).

## Issues and pull requests

Issues and merge requests should be in English and contain appropriate language for audiences of all ages.

We will only accept a merge requests which meets the following criteria:

* Squel.js and squel.min.js have been rebuilt using `npm run build`.
* Includes proper tests and all tests pass (unless it contains a test exposing a bug in existing code)
* Can be merged without problems (if not please use: `git rebase master`)
* Does not break any existing functionality
* Fixes one specific issue or implements one specific feature (do not combine things, send separate merge requests if needed)
* Keeps the Squel code base clean and well structured
* Contains functionality we think other users will benefit from too
* Doesn't add unnessecary configuration options since they complicate future changes
* Update the docs in the `gh-pages` branch and in the master `README.md` if necessary


## Release process (for core contributors)

See `RELEASE.md`.
