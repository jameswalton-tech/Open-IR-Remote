# Open IR Remote Interchange Standard v1.0.0

## Canonical file

The canonical record is UTF-8 JSON named `remote.irr.json`. It validates against `schema/open-ir-remote-v1.schema.json`. Unknown information must be represented explicitly and must never be inferred merely to satisfy an exporter.

Required top-level fields are `format`, `format_version`, `record_kind`, `id`, `updated`, `remote`, `locale`, `commands`, `provenance` and `validation`.

`id` is stable across renames and path corrections. Repository records use an `oir:` identifier. A third-party product creating an export before it knows the canonical library ID may use a UUID URN. `record_kind` distinguishes canonical library records, product exports, preserved legacy imports and documentation examples.

`remote.name` is the required human-facing identity of the physical handset. `remote.manufacturer`, `remote.model`, `remote.variant` and `remote.device_types` support browsing and matching. Paths are lowercase hyphenated indexes; they are not the permanent identity of a record.

## Compact storage and embedded devices

The format should be easy to contribute to and practical to store on small devices. JSON is the interchange file, not a required in-memory layout. An importer may store supported command values as integers and timing arrays, without retaining JSON field names or loading images and catalogue metadata into working memory. Keep the original record separately if the application needs to export it again without losing information.

Use record defaults for `protocol`, `carrier_hz` and `duty_cycle`, and override them only when a signal differs. A decoded signal needs an effective protocol and a raw signal needs an effective carrier frequency, supplied either by the signal or by record defaults. Resolve each setting independently: a signal-level value wins, otherwise use the matching default. An explicit null is invalid, not a request to inherit. Default protocol has no decoding meaning for raw or Pronto payloads. One signal representation per command is enough; up to three equivalent representations are allowed, with exactly one primary. Images remain separate files. Aliases, exporter details and extra descriptions can be omitted when they are not needed, but required identity, provenance and validation fields remain part of the interchange record.

Text limits are maximum lengths, not instructions to allocate fixed-size buffers. Existing limits include 120 characters for remote names and button labels, 80 for manufacturers and variants, and 100 for models and remote model numbers. A device may shorten a label on screen without changing the stored or exported value. Exporters should report values that exceed the schema limits rather than silently truncate them.

The schema and validator enforce the [field and storage limits](LIMITS.md), including 128 commands per remote and a 1 MiB ceiling for each standalone JSON record. Raw durations fit signed 32-bit storage; decoded integer parameters have explicit signed/unsigned 32-bit bounds, with bounded hexadecimal strings available for wider values. Do not assume all command values or timings fit in 16 bits. These are format ceilings, not a promise that every supported record fits every device. An importer with lower limits must report unsupported records without silently changing them.

The aim is to avoid duplicated data and give implementations predictable bounds, not to shorten every JSON key or introduce a second binary interchange format. These refinements are part of the current public draft, without a version bump.

## Commands

Each command has:

- `id`: stable software-facing semantic ID, for example `power.toggle`;
- `labels`: printed or localized button labels keyed by BCP 47 language tag;
- `action`: optional behavioural classification;
- `signals`: one or more decoded, raw or Pronto representations.

A decoded signal records protocol-specific `parameters` and supplies or inherits `protocol`. A raw signal supplies or inherits `carrier_hz` and records signed microsecond timings, with positive marks and negative spaces. A Pronto signal records the Pronto Hex payload. A command may carry up to three equivalent representations, and exactly one must be marked `primary`. Record-level `defaults` reduce repetition; signal-level values override them.

`protocol: "unknown"` is valid only for preserving an incomplete import. Such a signal uses `source_complete: false`, retains the original fields and cannot be exported to a target that requires a known protocol unless another complete representation exists.

`behaviour` records whether an action is discrete, toggled or stateful, plus repeat mode and timing when known. Stateful remotes, including many air-conditioner handsets, should export complete state frames rather than treating every printed button as an independent stateless command.

For ordinary button presses, omit `behaviour`. Omission means no extra behaviour has been described; it does not override a protocol's native repeat or toggle handling. `power.toggle` describes the device action, not a protocol toggle bit. Toggle-bit state must persist in the transmitting application according to its protocol implementation.

Raw arrays alternate positive marks and negative spaces, start with a mark and end with a space. The final space includes the gap before the next sequence. Do not add that gap twice. Raw data represents the captured sequence, not a promise of general stateful replay support.

This first version is a public draft. The optional behaviour metadata preserves observations; protocol-specific rendering, full state models and variant inheritance still need adapter implementations and conformance fixtures. Do not claim universal transmission support from schema validity alone.

## Exporter contract

An optional top-level `export_source` identifies the software that produced the record:

```json
"export_source": {
  "application": "Example Remote Editor",
  "version": "1.2.0",
  "build": "example-build-42",
  "url": "https://example.org/remote-editor",
  "exported_at": "2026-09-12T12:00:00Z"
}
```

When present, `application` and `version` are required. `build`, `url` and the UTC or offset-qualified export timestamp are optional. Version and build values are opaque strings; do not assume every application uses semantic versioning. This identifies the latest semantic exporter, while `provenance` preserves where the readings originally came from. A re-exporter replaces `export_source` with its own identity and preserves relevant prior export details in provenance. A catalog mirror that only distributes the unchanged record retains this object.

Do not include account names, machine identifiers, serial numbers or access tokens. Hand-authored records may omit the object. Importers should include this metadata in useful error reports, but must validate the actual record and never execute or automatically fetch its URL. Any workaround for a known exporter bug must be explicit, narrowly versioned and reported; metadata alone must not silently change signal values. Export-source fields are excluded from signal fingerprints and duplicate-signal comparisons.

A conforming third-party exporter must:

1. emit a valid v1 record with stable remote and command IDs;
2. preserve the physical remote name separately from controlled-device models;
3. provide at least one signal representation per command;
4. mark one representation as primary;
5. set `source_complete` truthfully;
6. include parameters for decoded data or timings for raw data, with the effective protocol or carrier supplied directly or through defaults;
7. preserve repeat, toggle and stateful behaviour when the source can express it;
8. preserve source provenance and use optional `export_source` to identify the latest exporting application and version;
9. avoid inventing missing values;
10. report information lost when exporting IRR to a less expressive target.

A complete new device export should contain at least one `source_complete: true` representation for every exported command. `legacy-import` exists to preserve older partial data and should not be advertised as universally transmit-ready.

## Carrier and validation

Carrier frequency is measured in hertz. Current seed records are verified at 38,000 Hz, but 38 kHz is not a universal default for every future record.

Validation states are:

- `imported-unverified`: source fields were preserved but not physically tested;
- `decoded`: protocol decoding is complete;
- `device-tested`: tested on identified equipment, with evidence and date;
- `community-verified`: independently confirmed;
- `rejected`: known invalid or unsafe data.

## CSV profile

The Excel-friendly CSV profile uses one command per row and repeats remote identity so the file is self-contained. CSV is a compatibility profile; JSON is canonical because one CSV row cannot cleanly carry several signal representations or structured behaviour.

```text
remote_name,manufacturer,remote_model,variant,locale,command_id,button_label,protocol,carrier_hz,address_hex,command_hex,code_hex,validation_status
```

Import followed by export to the same profile must preserve all source fields. Exporters must report data that a target format cannot represent.

CSV repeats effective protocol and carrier values on each row because it has no record-level defaults. Resolve JSON defaults before exporting CSV. Remote identity, labels, command IDs, carrier values and hexadecimal readings use the same field limits as JSON; one remote contains no more than 128 command rows. The checked-in seed CSVs preserve the original readings and need no textual changes for this refinement. CSV adapter implementations remain separate from the JSON validator.

## Compatibility

- Flipper `.ir`: generated only when the decoded protocol is supported or raw timings are complete.
- LIRC: generated conservatively with an information-loss report.
- Pronto Hex: imported as a Pronto representation or decoded when conversion is reliable.
- irdb CSV: mapped to decoded protocol parameters while preserving source provenance.

This is an unadopted public draft being refined in place with the existing `1.0.0` identifier and `/api/v1` path. Once the format is declared stable, minor additions must remain backward compatible and breaking changes will require a new major API and format version.
