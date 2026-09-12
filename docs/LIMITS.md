# Storage and field limits

These limits are part of Open IR Remote v1. They keep imports bounded without making every device reserve space for the largest possible remote. A small device can support less, but should explain what it cannot import rather than truncate names, drop commands or change timings silently.

## Text

Lengths count Unicode code points in the decoded JSON string, not UTF-8 bytes or the length of JSON escape sequences. A visible character can contain several code points. For example, a JavaScript importer can count code points with `Array.from(value).length` rather than `value.length`. Text remains Unicode; identifiers use the restricted patterns in the schema. No fixed-width buffers or automatic text normalization are required.

| Field | Maximum code points |
| --- | ---: |
| Remote name, remote aliases, button labels and button aliases | 120 |
| Manufacturer, including controlled-device manufacturer | 80 |
| Model, remote model number and controlled-device model | 100 |
| Variant | 80 |
| Record ID | 160 |
| Command ID, protocol name, device type and parameter key | 64 |
| Locale and label language key | 35 |
| Exporter application / build | 120 |
| Exporter version | 80 |
| Export timestamp | 40 |
| Date-only fields | 10 |
| Schema URL, exporter URL and image path / source URL | 2,048 |
| Image alternative text | 240 |
| Image rights holder / licence | 120 |
| Image rights notice | 2,048 |
| Provenance source path / rights statement | 2,048 |
| Provenance source revision and validation tester | 120 |
| Validation evidence entry | 2,048 |
| Notes, validation issue entries and parameter string values | 1,024 |
| Extension object key / string value | 64 / 1,024 |

Required names and labels must not be empty. Optional fields can be omitted; check the schema for whether an explicitly empty value is allowed. Enumerated fields such as `kind` use their listed values, not arbitrary strings. SHA-256 values are exactly 64 lowercase hexadecimal characters.

## Numbers and signals

| Value | Allowed range or representation |
| --- | --- |
| Carrier frequency | Integer hertz, 1,000–1,000,000; fits unsigned 32-bit storage |
| Raw mark / space duration | Signed integer microseconds, −2,147,483,647–2,147,483,647, excluding zero |
| Decoded numeric parameter | Integer, −2,147,483,648–4,294,967,295 |
| Repeat minimum count | Integer, 1–65,535 |
| Repeat interval | Integer milliseconds, 1–2,147,483,647 |
| Duty cycle | Number greater than 0 and at most 1; a fraction, not a percentage |

Choose signed or unsigned storage according to the parameter's meaning; the whole decoded-parameter range does not fit one signed 32-bit integer. Boolean and string parameters are also allowed. Values wider than 32 bits should use an explicitly defined string representation, not an imprecise JSON number. A parameter whose name ends in `_hex` must be a `0x`-prefixed hexadecimal string, at most 1,024 code points including the prefix. Preserve leading zeroes and source readings; do not infer byte order or remove apparently redundant fields from an unidentified protocol.

Raw sequences alternate positive marks and negative spaces, start with a mark and end with a space. Each of `intro_us`, `repeat_us` and `ending_us` has at most 4,096 entries, with at most 8,192 entries across the three arrays in one signal. Pronto Hex uses 4–8,192 four-digit hexadecimal words separated by single spaces (at most 40,959 code points). These syntax checks do not certify a valid protocol frame or successful transmission.

Each command has 1–3 signal representations and exactly one primary representation. Decoded signals carry parameters, raw signals carry timing arrays, and Pronto signals carry Pronto Hex; do not attach a second kind's payload to the same signal. One representation is sufficient. Retain another only when it provides a useful equivalent encoding.

## Collections

| Collection | Maximum entries |
| --- | ---: |
| Commands per remote | 128 |
| Signal representations per command | 3 |
| Remote aliases / button aliases | 16 each |
| Device types / label languages | 16 each |
| Controlled devices | 32 |
| Parameters per decoded signal | 32 |
| Provenance entries | 16 |
| Validation evidence / issues | 32 each |
| Top-level extension entries | 16 |
| Properties in each nested extension object | 32 |
| Items in each extension array | 64 |

Extension values may be null, booleans, bounded strings, integers in the decoded-parameter range, or nested objects and arrays with the limits above. Extensions are not an escape hatch for unbounded binary data. Unknown extensions should not affect signal playback.

## Whole records and images

A standalone `remote.irr.json` must be at most **1 MiB** when encoded as UTF-8, including whitespace. JSON object keys must be unique. Nesting is limited to **16 object/array containers**, counting the root object as depth 1. The validator checks file size before parsing and checks depth before schema validation. Applications should apply equivalent input limits; passing the schema alone does not check file size, total timing count, nesting depth or timing alternation.

The file-size ceiling is an interchange limit, not a recommended RAM allocation. Read the index first, fetch only the remotes needed, and use bounded or streaming parsing where appropriate. The full-library API response contains many records and is not subject to a single-record size or command limit.

Images stay outside the record. An optional `remote.webp` must be **240–1,600 pixels on each axis** and no more than **500 KiB**. It must have a transparent, plain-white or plain-neutral background. Image rights notices and identification-only restrictions still apply; see [CONTRIBUTING.md](../CONTRIBUTING.md).

KiB and MiB use binary units: 1 MiB is 1,024 KiB. The machine-readable `size_bytes` field stays an exact integer byte count; display file sizes in KiB or MiB in user interfaces.

The [JSON Schema](../schema/open-ir-remote-v1.schema.json), [validator](../tools/validate.py) and [boundary tests](../tests/test_format.py) implement these v1 rules. Records use `format_version: "1.0.0"` and the public API is served under `/api/v1`.
