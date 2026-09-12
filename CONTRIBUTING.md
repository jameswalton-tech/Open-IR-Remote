# Contributing a remote

Contributions are made through GitHub pull requests. One pull request should normally add or correct one physical remote or one closely related variant family.

## Before recording

Search the repository by manufacturer, remote name, model number and command hashes. If the handset already exists, improve that record instead of creating a duplicate.

Record the physical remote's printed name or best known name in `remote.name`. Do not use only the television, lamp or receiver model as the remote name. Put alternate names and retailer labels in `remote.aliases`.

## Create the record

1. Fork and clone the repository.
2. Copy `examples/example-device/remote.irr.json`.
3. Place the new file at `remotes/<manufacturer>/<model>/<variant>/remote.irr.json` using lowercase hyphenated paths.
4. Replace every example value. Never guess protocol, carrier, licensing or validation.
5. Use stable semantic command IDs such as `power.toggle`, `power.on`, `volume.up` and `navigation.ok`. Keep printed button wording in `labels`.
6. Include source provenance and describe how the signal was captured or imported.
7. Add test evidence when claiming `device-tested` or `community-verified`.

## Images

Images are optional until their rights are clear. If included, the file must:

- be named `remote.webp` and actually use the WebP media type;
- show one fully visible remote, preferably front-facing;
- use a transparent, plain-white or plain-neutral background;
- contain no hands, packaging, room scene, controller box, cables, watermark or decorative backdrop;
- be between 240 × 240 and 1600 × 1600 px;
- be no larger than 512,000 bytes;
- have EXIF/GPS metadata removed;
- include truthful holder, source and rights-basis information in the record.

Images remain the property of their respective copyright holders and are used only to identify the physical handset. An identification-only claim is not a substitute for provenance; maintainers may decline or remove an image where the basis is unclear.

## Excel and CSV submissions

The preferred format is `remote.irr.json`. Existing Excel workflows can export one command per CSV row using the columns documented in `docs/FORMAT.md`. A legacy CSV containing only `name,address_hex,command_hex,code_hex` is accepted for migration only when the pull request supplies the remote identity, carrier, protocol status, provenance and validation details.

## Validate and submit

Run:

```bash
python -m pip install jsonschema pillow
python tools/validate.py
python tools/build_api.py
git diff --check
```

Commit the record, any accepted image and regenerated `docs/api/v1` files. Push the branch and open a pull request. Complete every applicable item in the PR template, including physical-device testing and rights declarations.

Automated checks validate the schema, semantic IDs, image constraints, duplicate IDs and generated API. Maintainers may request clearer provenance, stronger evidence or a merge with an existing record.
