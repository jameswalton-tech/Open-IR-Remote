# Complete example device

The repository includes a fictional, rights-clear example at `examples/example-device/remote.irr`. It is deliberately not added to the public API index.

Use it as a submission template. It includes a decoded command, a raw command, record defaults, localized labels, provenance and validation evidence. Replace every fictional value with observed data before submitting a real remote.

The key rules demonstrated are:

- `remote.name` names the physical handset;
- command IDs are stable and labels are human-facing;
- decoded and raw commands can coexist, with one representation per button in this example;
- the decoded command inherits `protocol: "NEC"`, while the raw command inherits `carrier_hz: 38000`;
- the raw signal overrides the default duty cycle with `0.25`, without repeating the shared carrier;
- text, numeric values, arrays and file size meet the [storage limits](LIMITS.md);
- provenance and validation are separate;
- the documentation example is excluded from the live library.

See the [complete JSON file](../examples/example-device/remote.irr).

For receiver developers, a separate [receiver-export example](../examples/receiver-export/remote.irr) shows a stable handset command linked to a vendor-owned slot and action. Read the [implementation guide](RECEIVER_EXPORTS.md). Both examples are validated but excluded from the discovery index and full-library download.

The short raw sequence illustrates the structure only; it is not a captured NEC brightness command. Neither command is a transmission fixture for a real device. Protocol-specific integer parameters must fit the documented range; wider exact values can use `0x`-prefixed strings under a protocol-defined `_hex` key. Do not convert or discard imported hexadecimal source readings just to save a few bytes.
