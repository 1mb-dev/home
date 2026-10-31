# 1mb

**one-man-band**

All the hats. One head.

→ [1mb.dev](https://1mb.dev)

---

Things to use, read and build with, each shipped end to end.

The site, its counter API, and the design language behind them. To add a work, see [content/README.md](content/README.md). The design language: [design.md](design.md).

---

## Development

```bash
npm install
npm run gen           # write docs/ from content/; commit both together
npm test              # worker and generator tests
npm run validate      # lint, format, html/css checks
```

`npm run build` runs in CI only: it stamps the service worker version and dates into `docs/`. Never commit its output.

Counter API: [workers/README.md](workers/README.md).

## Release

A merge only checks. A manual run of CI on main deploys the site, a manual run of Deploy Worker deploys the worker, and a `v*` tag does both.

1. Merge the CHANGELOG entry and the version in `package.json` and its lock.
2. Run CI on main by hand and check the live site against the build.
3. Tag the commit from step 2 and push it: `git tag -a vX.Y.Z -m 'Name' <sha> && git push origin vX.Y.Z`. The subject names the release.
4. Publish the draft release the tag creates.

A pushed tag cannot be moved or deleted without editing the ruleset.

## License

[MIT](LICENSE)
