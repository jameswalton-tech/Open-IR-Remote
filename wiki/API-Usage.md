# API usage

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
