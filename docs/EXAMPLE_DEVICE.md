# Complete example device

The repository includes a fictional, rights-clear example at `examples/example-device/remote.irr.json`. It is deliberately not added to the public API index.

Use it as a submission template. It includes a decoded command, a raw command, record defaults, localized labels, provenance and validation evidence. Replace every fictional value with observed data before submitting a real remote.

The key rules demonstrated are:

- `remote.name` names the physical handset;
- command IDs are stable and labels are human-facing;
- decoded and raw commands can coexist in one remote, and a command may carry multiple equivalent representations;
- command-level carrier values override record defaults;
- provenance and validation are separate;
- the documentation example is excluded from the live library.

See the [complete JSON file](../examples/example-device/remote.irr.json).
