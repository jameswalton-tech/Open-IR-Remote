# Exporting from a receiver

A receiver can learn a button, assign it to a slot and use it to trigger an action. Those are three different things. Open IR Remote describes the physical remote and its signals; a receiver's slot layout and action bindings belong in optional, vendor-owned configuration metadata.

## Keep the identities separate

| Information | Where it belongs |
| --- | --- |
| Physical handset name, manufacturer and model | `remote` |
| Stable identity of that handset's record | Top-level `id` |
| Stable identity of a handset button | `commands[].id` |
| Printed or localized button text | `commands[].labels` |
| Exporting application or firmware and its version | `export_source` |
| Where and how the readings were obtained | `provenance` |
| Receiver model, slot assignments, custom names and action bindings | A vendor namespace under `extensions` |

Do not put the receiver manufacturer in `remote.manufacturer` unless it also manufactured the handset. `remote.controlled_devices` describes known controlled equipment, not the software or receiver that happened to export the file.

Ask the user to identify the handset when possible. If it is unknown, use a clearly unidentified handset name and truthful unknown manufacturer/model values. A receiver-branded placeholder must not be presented as a confirmed handset identity. Matching library signals can suggest a candidate for confirmation; matching codes alone do not prove who made a remote.

Preserve a known library record ID on re-export. Otherwise create a UUID once for the remote record and retain it across saves, renames and exports. Do not generate a new record ID every time the user downloads the same configuration.

## Buttons are not slots

Use a meaningful command ID such as `power.on` or `effect.rainbow` when the remote button's meaning is known. A receiver slot number is not that meaning. Moving a button from slot 1 to slot 12 must not change its command ID. Renaming a receiver action must not rename the remote button either.

When the original function is unknown, assign a persistent opaque ID that fits the command-ID pattern, for example `button.a7c2`. Do not derive it from the current slot, mutable label or receiver action. Do not infer a remote's button function just because the receiver maps it to a particular effect.

Each binding references an existing command ID. A receiver can bind one command to several actions or slots without duplicating the command's signal in the record. A custom receiver label belongs with the binding; `labels` continues to describe the handset button.

## Vendor-owned configuration

V1 already supports namespaced top-level `extensions`. No manufacturer-specific core field is needed. Choose a namespace controlled by the integration and document its own configuration version and semantics. Unknown extensions must not prevent another application from reading the core remote record, and must not affect generic signal playback.

For example, an integration using the `lightly` namespace could document this convention:

```json
"extensions": {
  "lightly": {
    "config_version": 1,
    "receiver_model": "Dock Lite",
    "binding_groups": [
      {
        "bindings": [
          {
            "command_id": "effect.rainbow",
            "slot": 1,
            "receiver_label": "Rainbow"
          }
        ]
      }
    ]
  }
}
```

This is an illustrative integration convention, not a reserved v1 field or a claim about existing firmware support. The integration must define slot numbering, permitted actions and how conflicting assignments are handled. Add receiver action identifiers and their settings within this namespace when they are needed to restore behaviour; a slot and label alone are not necessarily a complete configuration backup.

The example uses groups because each extension array is limited to 64 entries. Two groups of up to 64 bindings can cover 128 slots without exceeding that limit. A single object with 128 slot keys would also exceed the 32-property nested-object limit. Group boundaries have no command-identity meaning; check slot uniqueness across all groups where the receiver requires it. All remaining [field, depth and size limits](LIMITS.md) still apply.

A generic remote import should not automatically apply vendor bindings to live outputs or overwrite a receiver configuration. An explicit restore operation should validate the vendor configuration version, command references, slot ranges, actions and conflicts before applying anything. Preserve unknown metadata where a lossless re-export is supported; otherwise report what will be lost.

## One receiver can use several remotes

An IRR record represents one physical handset, not an arbitrary bank of learned slots. If a receiver learns buttons from different handsets, keep separate remote records. Bindings inside a record refer to its commands. A device-wide backup can carry those records and reference both remote IDs and command IDs in an application-specific container. V1 does not define that backup container, and it must not be presented as a single standard `remote.irr.json`.

If the device cannot establish which handset supplied each learned command, preserve that uncertainty in its own backup until the user groups the commands. Do not silently invent a single physical remote.

## Export the signal that was actually learned

- Report `protocol` from established source information or decoding, not from an exporter's hard-coded fallback. Use `unknown` with `source_complete: false` when it cannot be established.
- Set `source_complete` according to whether the signal representation contains enough reliable information for its target protocol implementation. Recognizing a slot or matching a receiver action is not sufficient.
- Keep `validation.status` separate: a complete decoded representation can still be `imported-unverified`. Do not claim physical transmission testing just because reception worked.
- Put common protocol, carrier and duty-cycle settings in `defaults`. Supply a carrier only when known; do not label a receiver's assumed tuning as a measured handset frequency.
- Define protocol-specific parameter meanings. Do not fill `code_hex` by copying `command_hex` merely to populate another field. Keep a genuine captured value with documented meaning, or omit an unnecessary parameter. Do not discard uncertain original readings during migration.
- Keep capture provenance and exporter identity separate. The latest exporter is not necessarily the original source or rights holder. Exports with unresolved rights must not silently acquire a redistribution licence.

## Implementation checks

1. Validate the export with the v1 schema and repository validator; schema acceptance alone cannot establish correct identity or signal semantics.
2. Export, import and export again: remote IDs, command IDs, signals and supported bindings should survive unchanged.
3. Reorder slots and change receiver labels: original command IDs and handset labels should remain unchanged.
4. Re-export the same handset twice: retain its record ID.
5. Exercise 128 slots using bounded binding groups, including invalid references, duplicate slots and out-of-range assignments.
6. Import with an unrelated application: it should be able to use supported core signals without interpreting the vendor extension.
7. Test a receiver containing buttons from two handsets: it must not merge their identities.
8. Check whether a restore really restores actions and settings, rather than only codes and labels.

The [complete receiver-export example](../examples/receiver-export/remote.irr.json) uses a fictional integration and is validated alongside other examples. Like all files under `examples/`, it is excluded from both public library endpoints.
