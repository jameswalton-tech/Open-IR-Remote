# Open IR Remote

Open IR Remote is an open interchange format and community library for infrared remote-control codes. The goal is to give applications one predictable format to import and export instead of maintaining incompatible private databases, with readable files for contributors and compact storage in mind for embedded devices.

If somebody has already learned and tested a remote, the next project should be able to reuse that work. This project is intended to grow through small, well-documented contributions from people building real hardware, software and hobby projects.

## Public API (work in progress)

Applications can poll:

```text
https://jameswalton-tech.github.io/Open-IR-Remote/api/v1/index.json
https://jameswalton-tech.github.io/Open-IR-Remote/api/v1/library.json
```

- `index.json` is the lightweight discovery endpoint and links to each remote.
- `library.json` contains the complete current library in one response.
- Individual record URLs are listed in the index.

Clients should cache responses and use conditional HTTP requests rather than polling continuously. The API is static, requires no key and is served with GitHub Pages' normal HTTPS and CORS behaviour. Consumers that cannot use Pages can read the equivalent files from the repo or a GitHub CDN.

See [API usage](docs/API.md) for implementation details and versioning guarantees.

## Repo layout

```text
remotes/<manufacturer>/<model>/<variant>/remote.irr.json
schema/open-ir-remote-v1.schema.json
docs/api/v1/index.json
docs/api/v1/library.json
examples/example-device/remote.irr.json
```

`remote.name` is required and identifies the physical handset/emitter device. Printed button text belongs in localized labels; command IDs remain stable for software integrations.

## Adding a new controller

1. Fork this repository.
2. Copy the [complete example](examples/example-device/remote.irr.json).
3. Create `remotes/<manufacturer>/<model>/<variant>/remote.irr.json`.
4. Add an image you have permission to use or created yourself `remote.webp` that meets the image rules.
5. Install `jsonschema` and `pillow`, then run `python tools/validate.py` and `python tools/build_api.py`. (An ai generated tool that checks the format).
6. Open a pull request using the supplied template.

Read [CONTRIBUTING.md](CONTRIBUTING.md) for the full submission and review process.

## Format support

IRR v1 represents decoded protocol parameters, raw mark/space timings or Pronto Hex. It supports record and command-level carrier settings, semantic command IDs, localized labels and validation status. CSV remains a supported flat profile for Excel-based capture workflows.

A remote should not need several copies of the same information. Use shared defaults where supported, include one signal representation per button unless another is useful, and keep images outside the JSON file. Devices can store the command data they need without keeping the full catalogue description in working memory. Readable field names stay in the interchange file; they do not need to become part of a device's internal storage.

The format is still a public draft. We are refining it in place before adoption, including consistent field limits and numeric ranges to help embedded developers plan storage. The existing version identifier stays unchanged during this work.

- [Format specification](docs/FORMAT.md)
- [Complete example device](docs/EXAMPLE_DEVICE.md)
- [JSON Schema](schema/open-ir-remote-v1.schema.json)
- [Contribution guide](CONTRIBUTING.md)
- [Project Wiki](https://github.com/jameswalton-tech/Open-IR-Remote/wiki)

## Licensing

Repository software is licensed under GPL-3.0 [LICENSE](LICENSE). The format specification is published under CC0-1.0. Remote data and images require explicit record-level rights information; see [DATA-LICENSE.md](DATA-LICENSE.md).

Remote images remain the property of their respective copyright holders and are included only to identify the physical handset/emitter device; see [NOTICE.md](NOTICE.md).
