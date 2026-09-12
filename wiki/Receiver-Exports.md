# Receiver exports

Keep physical handset identity in `remote`, exporting software in `export_source`, and receiver slots/actions in a vendor namespace under `extensions`. A command ID identifies the handset button, not its current receiver slot. Reordering slots must not change it.

Use persistent opaque IDs for unidentified buttons rather than guessing a semantic action. Keep separate records for different handsets. A receiver configuration spanning several remotes needs an application-specific backup container, not one invented handset record.

- [Receiver implementation guide](https://github.com/jameswalton-tech/Open-IR-Remote/blob/main/docs/RECEIVER_EXPORTS.md)
- [Complete receiver-export example](https://github.com/jameswalton-tech/Open-IR-Remote/blob/main/examples/receiver-export/remote.irr.json)

The example is fictional, validated, and excluded from both library endpoints. Vendor binding conventions are integration-owned, not new mandatory v1 fields. The guide includes bounded binding groups for 128 slots, signal-completeness checks and safe configuration restore behaviour.
