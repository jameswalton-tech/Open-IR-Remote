# Format reference

The canonical format is UTF-8 JSON named `remote.irr.json`.

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

Use shared defaults where supported and include additional signal representations only when useful. Text limits are upper bounds, not fixed buffer sizes. Consistent limits for the remaining fields, collection sizes and numeric ranges are still being worked into the current draft; they are not all enforced yet. This work does not introduce a second binary format or change the current version identifier.
