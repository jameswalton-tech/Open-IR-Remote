# API design and acceptance policy

`parse(text | utf8)` validates a standalone record and returns the complete editable JSON tree. `serialize(record)` validates and emits compact JSON with sorted object keys. Both fail with `OpenIrError.issues`, using JSON Pointer paths. Neither assigns IDs, normalizes text, fills protocol guesses or removes metadata.

`validate(record)` returns record validation issues and explicitly identifies image assets as unchecked. `effectiveSignal(record, signal)` resolves inherited settings in a copy. `assessCapabilities(record, predicate)` reports every unsupported representation without modifying the record. It makes no playback claim.

`tryImportIrdb(csv, identity)` is the CSV adoption path. It returns accepted with a record, or ignored with reasons. Only whole submissions with the exact five-column header, all five values present, valid v1 values, and 1 to 128 commands are accepted. Blank labels count as incomplete. Oversized files and files with any incomplete or malformed row are ignored. No row selection, splitting, fallback labels or deduplication occurs. Explicit -1 source sentinels remain values and are preserved.

`parseIrdb(csv)` exposes original text, rows and diagnostics for inspection. It is not acceptance. `importIrdb(collection, identity)` is the throwing counterpart of tryImportIrdb. It reparses source and enforces the same whole-submission policy, including when extra arguments or inspection header overrides are supplied. `restoreIrdbSource(record)` reconstructs archived CSV and reports that later Open IR edits are not exported.

The browser record validator uses the unmodified pinned JSON Schema compiled by Ajv. Node users can call the pinned Python validator for its complete record and image checks. Differential tests compare acceptance and document stricter JavaScript numeric safeguards. Public record types are generated from the schema. No protocol rendering engine is included.
