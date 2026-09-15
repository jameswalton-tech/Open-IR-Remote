# Static API

Open IR Remote publishes a static, versioned JSON API through GitHub Pages.

## Endpoints

```text
GET /api/v1/index.json
GET /api/v1/library.json
GET /api/v1/remotes/<manufacturer>/<model>/<variant>/remote.irr
```

The index is the recommended polling target. It contains the library update date, record count, lightweight metadata and canonical URLs. Download `library.json` only when an application needs every full record at once.

Individual remote downloads use `.irr` and contain UTF-8 JSON. The manifest and library bundle keep their `.json` extensions. Follow the manifest URLs rather than constructing filenames. Static hosts may serve `.irr` as `application/octet-stream`; clients should parse the response as JSON and validate the record instead of requiring a JSON Content-Type header. Import file pickers should include `.irr`.

`index.json` is the library manifest. It lists every published remote, not developer examples. Use `id` as the cache key, `sha256` as the change detector and `url` as the download location. The `updated` date is informational: two changes on one day can have the same date but different hashes.

## Automatic publication

Every push or merge to `main` runs the **Publish remote library** GitHub Action. It validates source records and examples, runs the tests, rebuilds the compact manifest, individual records and full library, and deploys the result to GitHub Pages. A failed build is not deployed. The last successful site remains available. Maintainers can also run the workflow manually on `main`.

Publication uses the rebuilt artifact, not a contributor's pre-generated API files. The checked-in `docs/api/v1` files are a development snapshot and may lag later source changes. The hosted endpoints are the current distribution; `remotes/` is the source of truth. Contributors do not need to update generated files by hand.

## Local caching and project imports

1. Load the last validated cache at application startup so offline use works.
2. Fetch the manifest when a refresh is due, normally no more than once per hour. Validate its format/version, entries and unique IDs before using it.
3. Compare each selected remote's ID and hash with the local cache. Keep unchanged records. Download only new or changed records the application needs, or all entries if it intentionally maintains a complete mirror.
4. Hash the downloaded record's exact response content before parsing or reformatting it. Compare against the manifest SHA-256, validate the record and check that its ID matches. Standard HTTP content decoding happens before this check; do not hash gzip transport bytes.
5. Stage valid updates, then atomically replace the relevant cache entries. Keep the last valid data on network errors, invalid JSON, unsupported versions or mismatched hashes. A publication/CDN transition can briefly yield mismatched files; refetch the manifest and retry later rather than accepting the mismatch.
6. Treat removed manifest entries as unavailable upstream. Do not silently delete a remote already imported into a user's project or rewrite their bindings. Keep project-owned copies separate from the replaceable discovery cache and offer explicit updates.

Cache images separately and fetch them only when needed. Their records include an independent SHA-256. Cached content retains its source and rights information; downloading or caching does not grant redistribution rights.

Native clients can persist HTTP validators and use `If-None-Match` or `If-Modified-Since`. A `304` response keeps the existing cache. Browser clients can use normal HTTP revalidation via `fetch(..., {cache: "no-cache"})`; cross-origin validator headers may not be exposed, so manual conditional headers must not be a requirement. Use IndexedDB for a browser's persistent record cache or application storage on a native device. The example below fetches the manifest only; it is not a full cache implementation.

## Client behaviour

- Treat `format_version` and API path version separately.
- Cache successful responses.
- Use `If-None-Match` or `If-Modified-Since` when supported by the client stack.
- Keep the last valid library if a request fails or returns invalid JSON.
- Validate unknown fields leniently within the same major version.
- Do not poll more frequently than once per hour unless a maintainer announces a different policy.
- Do not infer that `device-tested` means tested on every device model that may use the same remote.
- Resolve protocol, carrier and duty-cycle settings from each record's `defaults`, with signal-level values taking precedence. Missing settings are not zero values.
- Apply the [field and storage limits](LIMITS.md) to individual records. The full library contains multiple records and is not subject to a single-record byte ceiling; small devices should fetch selected records through the index.

```javascript
const response = await fetch(
  "https://jameswalton-tech.github.io/Open-IR-Remote/api/v1/index.json",
  { cache: "no-cache" }
);
if (!response.ok) throw new Error(`IR library request failed: ${response.status}`);
const index = await response.json();
```

GitHub Pages is the convenience distribution endpoint. The Git repository remains the source of truth.

Published JSON is compact UTF-8 with a final newline; canonical repository records remain formatted for review. Parsers must not depend on indentation or line numbers. This preserves the v1 structure and every value while reducing transfer size. See [compactness measurements](COMPACTNESS.md). Index hashes cover the exact published bytes, so formatting-only changes can alter hashes without changing remote identity.

Each index entry includes a SHA-256 for the individual JSON response, so clients can detect changes even when the calendar date is unchanged. In `library.json`, image paths are absolute URLs; in individual records they resolve relative to the record URL. Image identification notices do not grant an open redistribution licence. Signal records whose provenance says `unknown` also require a rights check by consumers before redistribution.
