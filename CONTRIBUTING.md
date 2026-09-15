# Contributing a remote

Contributions are made through GitHub pull requests. One pull request should normally add or correct one physical remote or one closely related variant family.

## Before recording

Search the repository by manufacturer, remote name, model number and command hashes. If the handset already exists, improve that record instead of creating a duplicate.

Record the physical remote's printed name or best known name in `remote.name`. Do not use only the television, lamp or receiver model as the remote name. Put alternate names and retailer labels in `remote.aliases`.

## Create the record

1. Fork and clone the repository.
2. Copy `examples/example-device/remote.irr`.
3. Place the new file at `remotes/<manufacturer>/<model>/<variant>/remote.irr` using lowercase hyphenated paths.
4. Replace every example value. Never guess protocol, carrier, licensing or validation.
5. Use stable semantic command IDs such as `power.toggle`, `power.on`, `volume.up` and `navigation.ok`. Keep printed button wording in `labels`.
6. Include source provenance and describe how the signal was captured or imported.
7. Add test evidence when claiming `device-tested` or `community-verified`.

## Keep the record compact

If your product learns IR into slots, read [exporting from a receiver](docs/RECEIVER_EXPORTS.md). Slots and receiver actions belong in vendor metadata; the core record still identifies the physical handset and its buttons. Use the separate receiver-export example for implementation testing, not as a real library submission.

Put common protocol, carrier and duty-cycle settings in `defaults`; omit matching settings from individual signals. A signal can override a default when needed. Include one signal representation per button unless another equivalent representation is useful, and keep exactly one primary.

Follow the [field and storage limits](docs/LIMITS.md): at most 128 commands, three signals per command and 1 MiB per JSON record. Remote names allow 120 Unicode code points, manufacturers 80 and models 100. Never truncate a reading or name to make validation pass; report values the format cannot represent. Keep required provenance and rights information, and omit optional metadata only when it is not needed.

## Images

Images are optional until their rights are clear. If included, the file must:

- be named `remote.webp` and actually use the WebP media type;
- show one fully visible remote, preferably front-facing;
- use a transparent, plain-white or plain-neutral background;
- contain no hands, packaging, room scene, controller box, cables, watermark or decorative backdrop;
- be between 240 × 240 and 1600 × 1600 px;
- be no larger than 500 KiB;
- have EXIF/GPS metadata removed;
- include truthful holder, source and rights-basis information in the record.

Images remain the property of their respective copyright holders and are used only to identify the physical handset. An identification-only claim is not a substitute for provenance; maintainers may decline or remove an image where the basis is unclear.

## JSON and CSV submissions

If your application exports the JSON file, include `export_source` with its name and version. This helps us reproduce conversion bugs. Include a build identifier when available; do not add personal or device identifiers. Leave the field out for hand-authored files rather than guessing.

The preferred format is `remote.irr`. CSV submissions use one command per row with the columns documented in `docs/FORMAT.md`. Include the remote identity, carrier, protocol status, provenance and validation details needed to create a complete record.

## Validate and submit

Run:

```bash
python -m pip install jsonschema pillow
python tools/validate.py
python -m unittest discover -s tests -v
python tools/build_api.py
git diff --check
```

Commit the source record and any accepted image. Push the branch and open a pull request. Complete every applicable item in the PR template, including physical-device testing and rights declarations. Running the generator locally is useful for inspection, but committing generated API files is not required: GitHub Actions rebuilds and publishes the library after merging to `main`.

Automated checks validate the schema, semantic IDs, image constraints, duplicate IDs and generated API. Maintainers may request clearer provenance, stronger evidence or a merge with an existing record.
