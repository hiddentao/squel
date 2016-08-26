## Creating a new release

1. Make final commits
2. Push to `master` on Github and wait for build to pass
3. Update `version` field in `package.json`
4. Update `CHANGELOG.md` with details of release
5. Run `npm test`
6. Commit and push to Github
7. Tag commit as <version>
8. Push all tags to Github: `git push --tags`
9. Publish to NPM: `npm publish`
10. Announce to world!

