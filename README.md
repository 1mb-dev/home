# 1mb

**one-man-band**

All the hats. One head.

→ [1mb.dev](https://1mb.dev)

---

Things to use, read and build with, each shipped end to end.

The site, its counter API, and the design language behind them. To add a work, see [design.md](design.md#content-format).

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

## License

[MIT](LICENSE)
