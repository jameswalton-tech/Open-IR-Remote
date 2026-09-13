# API usage

`index.json` is the complete library manifest. Cache records by stable ID and SHA-256, fetch only new or changed records, and keep the last valid cache when offline. Keep project-imported remotes separate from the discovery cache so upstream updates do not silently change a user's configuration.

Every merge or push to `main` automatically validates, rebuilds and publishes the library through GitHub Actions. Failed builds are not deployed. Generated files checked into the repository are development snapshots; use the hosted API for the current distribution. See the [full caching and publication guide](https://github.com/jameswalton-tech/Open-IR-Remote/blob/main/docs/API.md).

The API serves compact JSON with all v1 fields preserved; repository source records remain readable. See [compactness and irdb comparison](https://github.com/jameswalton-tech/Open-IR-Remote/blob/main/docs/COMPACTNESS.md) for measured sizes and implementation trade-offs. Hashes describe the exact published bytes, so a formatting-only change can alter a hash without changing handset identity.

Resolve each signal's protocol, carrier and duty cycle from the record defaults unless it supplies an override. Follow the [field and storage limits](https://github.com/jameswalton-tech/Open-IR-Remote/blob/main/docs/LIMITS.md) for each remote. The full-library response contains multiple records; the single-record byte limit does not cap the whole library.

Use the discovery endpoint for routine update checks:

```text
https://jameswalton-tech.github.io/Open-IR-Remote/api/v1/index.json
```

Use the complete library only when the application needs every full record:

```text
https://jameswalton-tech.github.io/Open-IR-Remote/api/v1/library.json
```

Cache responses and use conditional HTTP requests. Keep the last validated library if the endpoint is temporarily unavailable. The v1 index links to every individual remote record.

Individual records and their images use:

```text
/api/v1/remotes/<manufacturer>/<model>/<variant>/remote.irr.json
/api/v1/remotes/<manufacturer>/<model>/<variant>/remote.webp
```

The Git repository is the source of truth; GitHub Pages is the convenience distribution endpoint.
