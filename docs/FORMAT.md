# Open IR Remote Interchange Standard v1.0.0

## Canonical file

The canonical record is UTF-8 JSON named `remote.irr.json`. It validates against `schema/open-ir-remote-v1.schema.json`. Unknown information must be represented explicitly and must never be inferred merely to satisfy an exporter.

Required top-level fields are `format`, `format_version`, `record_kind`, `id`, `updated`, `remote`, `locale`, `commands`, `provenance` and `validation`.

`id` is stable across renames and path corrections. Repository records use an `oir:` identifier. A third-party product creating an export before it knows the canonical library ID may use a UUID URN. `record_kind` distinguishes canonical library records, product exports, preserved legacy imports and documentation examples.

`remote.name` is the required human-facing identity of the physical handset. `remote.manufacturer`, `remote.model`, `remote.variant` and `remote.device_types` support browsing and matching. Paths are lowercase hyphenated indexes; they are not the permanent identity of a record.

## Commands

Each command has:

- `id`: stable software-facing semantic ID, for example `power.toggle`;
- `labels`: printed or localized button labels keyed by BCP 47 language tag;
- `action`: optional behavioural classification;
- `signals`: one or more decoded, raw or Pronto representations.

A decoded signal records `protocol` and protocol-specific `parameters`. A raw signal records `carrier_hz` and signed microsecond timings, with positive marks and negative spaces. A Pronto signal records the Pronto Hex payload. A command may carry several equivalent representations, and exactly one should be marked `primary`. Record-level `defaults` reduce repetition; signal-level values override them.

`protocol: "unknown"` is valid only for preserving an incomplete import. Such a signal uses `source_complete: false`, retains the original fields and cannot be exported to a target that requires a known protocol unless another complete representation exists.

`behaviour` records whether an action is discrete, toggled or stateful, plus repeat mode and timing when known. Stateful remotes, including many air-conditioner handsets, should export complete state frames rather than treating every printed button as an independent stateless command.

For ordinary button presses, omit `behaviour`. Omission means no extra behaviour has been described; it does not override a protocol's native repeat or toggle handling. `power.toggle` describes the device action, not a protocol toggle bit. Toggle-bit state must persist in the transmitting application according to its protocol implementation.

Raw arrays alternate positive marks and negative spaces, start with a mark and end with a space. The final space includes the gap before the next sequence. Do not add that gap twice. Raw data represents the captured sequence, not a promise of general stateful replay support.

This first version is a public draft. The optional behaviour metadata preserves observations; protocol-specific rendering, full state models and variant inheritance still need adapter implementations and conformance fixtures. Do not claim universal transmission support from schema validity alone.

## Exporter contract

A conforming third-party exporter must:

1. emit a valid v1 record with stable remote and command IDs;
2. preserve the physical remote name separately from controlled-device models;
3. provide at least one signal representation per command;
4. mark one representation as primary;
5. set `source_complete` truthfully;
6. include protocol and parameters for decoded data, or carrier and timings for raw data;
7. preserve repeat, toggle and stateful behaviour when the source can express it;
8. include provenance naming the exporting application and version;
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

## Compatibility

- Flipper `.ir`: generated only when the decoded protocol is supported or raw timings are complete.
- LIRC: generated conservatively with an information-loss report.
- Pronto Hex: imported as a Pronto representation or decoded when conversion is reliable.
- irdb CSV: mapped to decoded protocol parameters while preserving source provenance.

Minor v1 additions remain backward compatible. Breaking changes require a new major API and format version.
