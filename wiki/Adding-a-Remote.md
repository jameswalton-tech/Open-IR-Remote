# Adding a remote

1. Search the repository for the remote name, printed model number and manufacturer.
2. Fork the repository and create a branch.
3. Copy the complete example record.
4. Add `remotes/<manufacturer>/<model>/<variant>/remote.irr.json`.
5. Use stable command IDs and preserve printed labels separately.
6. Include carrier, protocol or raw timings without guessing missing information.
7. Record provenance and physical-device test evidence.
8. Add a rights-cleared `remote.webp` only when it meets the image rules.
9. Run the validator and API generator.
10. Push the branch and open a pull request using the repository template.

One pull request should normally cover one physical remote or a closely related variant family. Maintainers will check schema conformance, duplicates, provenance, image rights and validation claims.

Full instructions: [CONTRIBUTING.md](https://github.com/jameswalton-tech/Open-IR-Remote/blob/main/CONTRIBUTING.md).
