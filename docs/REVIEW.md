# V1 scope and validation review

The repository publishes Open IR Remote v1 and its discovery API. It provides an interchange format, shared library and validation tools, not a universal transmission SDK.

The review checked stable remote identity, preservation of the 70 source readings, named remotes separate from controlled devices, multiple signal representations, optional behaviour metadata, generated API consistency and image references. The validator checks JSON Schema, unique identifiers, primary signals, raw timing signs, WebP dimensions and hashes.

The seed remotes have user-reported 38 kHz testing, but their protocol remains unidentified. The recorded test date is the date confirmation was supplied, not an independently observed laboratory date. Generic Number Remote has 16 readings; its photograph includes a zero button with no supplied reading. No value has been invented for it.

Implementation scope: this repository does not supply a protocol parameter/byte-order registry, tested bidirectional adapters or full toggle/stateful rendering. Variant inheritance is outside the v1 contract. Applications must support the actual protocol and signal representation before claiming they can transmit a record. Record-level source rights remain explicit; copyright notices for identification images are not blanket licences for downstream products.

V1 includes inherited protocol/carrier settings, bounded text and collections, explicit integer ranges, a 1 MiB standalone-record limit and nesting limits. Boundary tests cover valid limits, overflows, missing defaults, overrides, Unicode lengths, duplicate keys and deterministic API generation. Seed hexadecimal readings remain unchanged; shared signal settings are stored in record defaults. The format identifier is `1.0.0` and the API path is `/api/v1`.
