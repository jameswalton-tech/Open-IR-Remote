# Format reference

The canonical format is UTF-8 JSON named `remote.irr`.

Applications may include `export_source` with their name, version and optional build identifier. This helps contributors reproduce export bugs without confusing the exporting software with the original source of the readings.

Every record contains:

- format and schema version;
- last-updated date;
- required physical remote name, manufacturer, model and variant;
- BCP 47 locale;
- stable semantic commands and localized labels;
- decoded, raw or Pronto signal data;
- carrier frequency and repeat details where known;
- provenance, rights and validation evidence;
- an optional rights-cleared WebP image.

Record defaults reduce duplication. Command-level signal values override defaults. Unknown values are represented explicitly and exporters must not guess them.

Normative specification: [docs/FORMAT.md](https://github.com/jameswalton-tech/Open-IR-Remote/blob/main/docs/FORMAT.md).

## Small-device storage

JSON is the shared file format, not a required memory layout. Devices can keep the supported commands as integers and timing arrays while leaving images and catalogue descriptions out of working memory. Applications that need a lossless re-export should retain the original record separately.

Shared protocol, carrier and duty-cycle defaults are inherited unless a signal supplies an override. Include additional signal representations only when useful. Text limits are upper bounds, not fixed buffer sizes. The schema and validator enforce bounded text, numeric values and collections: at most 128 commands, three representations per command and 1 MiB per standalone record. See the complete [field and storage limits](https://github.com/jameswalton-tech/Open-IR-Remote/blob/main/docs/LIMITS.md). These are v1 requirements, using `format_version: "1.0.0"` and the `/api/v1` endpoint.
