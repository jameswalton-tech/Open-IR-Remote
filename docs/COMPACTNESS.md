# Compact files without losing the remote

The goal is a small, portable remote definition, not the shortest file at any cost. Keep readable source records for contributors and compact JSON for applications. Both encodings have exactly the same v1 fields and values; whitespace is not part of the format contract.

## What we can learn from irdb

[irdb](https://github.com/probonopd/irdb) uses a concise decoded-code CSV: function name, protocol, device, subdevice and function. Manufacturer and device category are carried in its directory structure. Its [Samsung TV example](https://github.com/probonopd/irdb/blob/master/codes/Samsung/TV/7%2C7.csv) illustrates that approach. It is a useful design for a decoded signal database.

Open IR Remote serves a different interchange need: a self-contained handset identity, stable command IDs, localized labels, raw or Pronto alternatives, source/rights information and optional receiver configuration. Those fields cost space but allow a file to travel outside its original repository without losing its context. A stripped CSV and a complete IRR record are not equivalent payloads. We do not claim a larger feature set makes every use case better served by JSON.

## V1 distribution

- Canonical records and examples remain formatted for review.
- All generated JSON API responses use compact UTF-8 JSON with a final newline. The index, individual records and full library retain every field and value.
- Images remain external and are fetched only when needed.
- Common protocol, carrier and duty-cycle settings belong in `defaults` where applicable.
- Include one signal representation per command unless another is useful. Preserve actual source data; do not delete apparently redundant readings from unidentified protocols.
- Index hashes identify the exact published record bytes. A serialization change can change a hash without changing the decoded JSON value. Applications should not treat every hash change as a new handset identity.

Measurements for the current three-record library, excluding image files:

| Payload | Readable JSON | Published compact JSON | Reduction |
| --- | ---: | ---: | ---: |
| Discovery index | 1.96 KiB | 1.56 KiB | 20.1% |
| Full library | 38.73 KiB | 19.25 KiB | 50.3% |
| Astera ARC1 | 12.53 KiB | 7.16 KiB | 42.8% |
| Astera ARC3 | 11.99 KiB | 6.99 KiB | 41.7% |
| Generic Number Remote | 7.90 KiB | 4.70 KiB | 40.5% |

Run `python tools/measure_size.py` to reproduce the comparison on the current library. It compares identical decoded content in both encodings. Figures change as records change. The tool also measures gzip locally; this is not a promise that the host sends compressed responses. Compression and compact JSON reduce transfer/storage size, not necessarily parsed RAM usage.

## Decoded interoperability matters as much as size

An irdb `device`/`subdevice`/`function` tuple must not be mechanically renamed to `address_hex`/`command_hex` without a verified protocol-specific mapping. Protocol names, address construction, bit order and repeat behaviour need to agree between exporter and renderer. Preserve the original protocol name and tuple when a mapping is not established, and do not claim a transmit-ready conversion.

V1 parameter values may use bounded integers rather than hexadecimal strings when the integration defines their meaning. Wider exact values use documented string encodings. A generic `code_hex` field does not by itself define a complete wire frame. A tested protocol-parameter registry and conversion fixtures would improve interoperability more than shortening descriptive field names, but this repository does not yet provide that registry or an irdb converter.

## Embedded implementations

After validating a file, a device can store its supported protocol values and button identifiers in compact internal structures. It need not retain JSON property names in RAM. If it discards descriptive metadata or unsupported extensions, report that a lossless re-export is unavailable or retain the source separately.

Devices may impose lower limits than v1's 128 commands and 1 MiB standalone-record ceiling, provided they reject unsupported input clearly. A complete library download is optional; fetch selected records through the index. V1 does not mandate a second binary format, a compressed parser, or a minimum device RAM allocation.
