# Open IR Remote

Open IR Remote is a public, versioned interchange standard and community library for infrared remote-control codes. It gives applications one predictable format to import, export and poll instead of maintaining incompatible private spreadsheets.

If somebody has already learned and tested a remote, the next project should be able to reuse that work. This repository is intended to grow through small, well-documented contributions from people building real hardware and software.

The initial library contains 70 device-tested commands across three remotes. Their 38 kHz carrier has been verified in the contributor's test setup. The protocol family is still being identified, so the records preserve the imported hexadecimal readings without guessing NEC, RC5 or another protocol.

## Public API

Applications can poll:

```text
https://jameswalton-tech.github.io/Open-IR-Remote/api/v1/index.json
https://jameswalton-tech.github.io/Open-IR-Remote/api/v1/library.json
```

- `index.json` is the lightweight discovery endpoint and links to each remote.
- `library.json` contains the complete current library in one response.
- Individual record URLs are listed in the index.

Clients should cache responses and use conditional HTTP requests rather than polling continuously. The API is static, requires no key and is served with GitHub Pages' normal HTTPS and CORS behaviour. Consumers that cannot use Pages may read the equivalent files from the repository or a GitHub CDN.

See [API usage](docs/API.md) for implementation details and versioning guarantees.

## Repository layout

```text
remotes/<manufacturer>/<model>/<variant>/remote.irr.json
schema/open-ir-remote-v1.schema.json
docs/api/v1/index.json
docs/api/v1/library.json
examples/example-device/remote.irr.json
```

`remote.name` is required and identifies the physical handset. Printed button text belongs in localized labels; command IDs remain stable for software integrations.

## Add a remote

1. Fork this repository.
2. Copy the [complete example](examples/example-device/remote.irr.json).
3. Create `remotes/<manufacturer>/<model>/<variant>/remote.irr.json`.
4. Add a rights-cleared `remote.webp` only if it meets the image rules.
5. Install `jsonschema` and `pillow`, then run `python tools/validate.py` and `python tools/build_api.py`.
6. Open a pull request using the supplied template.

Read [CONTRIBUTING.md](CONTRIBUTING.md) for the full submission and review process.

## Format support

IRR v1 represents decoded protocol parameters, raw mark/space timings or Pronto Hex. It supports record and command-level carrier settings, semantic command IDs, localized labels, provenance and validation status. CSV remains a supported flat profile for Excel-based capture workflows.

- [Format specification](docs/FORMAT.md)
- [Complete example device](docs/EXAMPLE_DEVICE.md)
- [JSON Schema](schema/open-ir-remote-v1.schema.json)
- [Contribution guide](CONTRIBUTING.md)
- [Project Wiki](https://github.com/jameswalton-tech/Open-IR-Remote/wiki)

## Licensing

Repository software is licensed under GPL-3.0 as stated in [LICENSE](LICENSE). The format specification is published under CC0-1.0. Remote data and images require explicit record-level provenance and rights information; see [DATA-LICENSE.md](DATA-LICENSE.md).

Remote images remain the property of their respective copyright holders and are included only to identify the physical handset; see [NOTICE.md](NOTICE.md).
