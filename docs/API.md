# Static API

Open IR Remote publishes a static, versioned JSON API through GitHub Pages.

## Endpoints

```text
GET /api/v1/index.json
GET /api/v1/library.json
GET /api/v1/remotes/<manufacturer>/<model>/<variant>/remote.irr.json
```

The index is the recommended polling target. It contains the library update date, record count, lightweight metadata and canonical URLs. Download `library.json` only when an application needs every full record at once.

## Client behaviour

- Treat `format_version` and API path version separately.
- Cache successful responses.
- Use `If-None-Match` or `If-Modified-Since` when supported by the client stack.
- Keep the last valid library if a request fails or returns invalid JSON.
- Validate unknown fields leniently within the same major version.
- Do not poll more frequently than once per hour unless a maintainer announces a different policy.
- Do not infer that `device-tested` means tested on every device model that may use the same remote.

```javascript
const response = await fetch(
  "https://jameswalton-tech.github.io/Open-IR-Remote/api/v1/index.json",
  { cache: "no-cache" }
);
if (!response.ok) throw new Error(`IR library request failed: ${response.status}`);
const index = await response.json();
```

GitHub Pages is the convenience distribution endpoint. The Git repository remains the source of truth.

Each index entry includes a SHA-256 for the individual JSON response, so clients can detect changes even when the calendar date is unchanged. In `library.json`, image paths are absolute URLs; in individual records they resolve relative to the record URL. Image identification notices do not grant an open redistribution licence. Signal records whose provenance says `unknown` also require a rights check by consumers before redistribution.
