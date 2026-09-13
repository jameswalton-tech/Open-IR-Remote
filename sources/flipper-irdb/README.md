# Flipper-IRDB import review

Thanks to [Flipper-IRDB](https://github.com/Lucaslhm/Flipper-IRDB) and its contributors for collecting and sharing these captures. This batch adds 10 listings and 289 commands. It favours everyday control categories, but is not a ranking of the most widely sold handsets.

## Listings

| Listing | Use | Commands | Handset identity |
| --- | --- | ---: | --- |
| LG 6711R1P073B | DVX7900 DVD/VCR | 60 | Explicit in source |
| Continental Edison CELD55SQLDV24B6 | TV | 24 | Equipment model only |
| Hilton Connected Room | Room entertainment receiver | 17 | Manufacturer and handset model unknown |
| Sony RM-PJ1000 | VPH-D50 projector | 84 | Explicit in source |
| Philips HTL2060/94 | Soundbar | 13 | Equipment model only |
| Fosi Audio ZD3 | Desktop DAC | 13 | Equipment model only |
| Fosi Audio ZH3 | DAC/amplifier | 13 | Equipment model only |
| Nakamichi RM-4TA | A/V controls | 42 | Source identity needs confirmation |
| Tesla TE-300 | DVB-T2 receiver | 21 | Equipment model only |
| Dimplex Optiflame | Fireplace on/off | 2 | Equipment family only |

All records are `imported-unverified`. No physical handset, receiver or transmitter was tested for this import. A complete conversion of an upstream file does not mean a complete capture of the original handset.

Hilton's source describes an edge computer, not direct control of every hotel TV. It does not establish compatibility across hotels. Dimplex's file contains only two commands. The Nakamichi source does not clearly distinguish handset and receiver model, so the handset model remains `Unknown`. Source spelling `Fossi Audio` is normalized to `Fosi Audio` for ZH3 using the manufacturer link in its original comments.

## Source and permission evidence

The snapshot is [d126fb1b6f1e114c52b4a8c19839ea65e3a9c24d](https://github.com/Lucaslhm/Flipper-IRDB/tree/d126fb1b6f1e114c52b4a8c19839ea65e3a9c24d). Its [licence notice](https://github.com/Lucaslhm/Flipper-IRDB/blob/d126fb1b6f1e114c52b4a8c19839ea65e3a9c24d/README.md) offers contributions under CC0-1.0 but explicitly excludes commits before `2319685f2cbf0cd3f809609622cade14d24fb819` (7 August 2025). This is not permission to relicense the whole historical collection.

[selection.json](selection.json) records each introduction commit, date, source path, SHA-256 and destination. Each record links to its exact upstream file. [LICENSE](LICENSE) preserves the upstream CC0 text. Original comments and contributor credits remain in the adjacent `source.ir` files, archived byte for byte.

For this batch, each file's introduction was checked with `git log --follow --diff-filter=A`, followed by `git merge-base --is-ancestor` against the licence cutoff. All ten introduction commits descend from that cutoff. Some other candidates traced to similar older files and were excluded conservatively. Git similarity detection is not proof of copying or authorship; it is a reason to seek clarification before importing those files.

No images are imported. These data permissions do not establish rights to remote photographs, logos or other media. Manufacturer names identify equipment and do not imply endorsement.

## Conversion and playback

The [Flipper file format](https://developer.flipper.net/flipperzero/doxygen/infrared_file_format.html) stores decoded protocol names and four-byte address/command values. The importer converts those little-endian stored bytes into unsigned hexadecimal numbers. It does not reverse transmitted bits or translate a protocol into a different protocol family.

Protocol names are retained exactly. Shared protocol values move into Open IR `defaults`; every original button label and both numeric parameters are preserved. Duplicate labels, if present, get separate command IDs. The generated IDs are assigned for this initial import and must not be regenerated from edited display labels later.

`source_complete: true` means all fields of that decoded source signal were preserved. It does not certify playback. A transmitter adapter must understand the Flipper protocol and parameter convention, including any protocol-specific repeat or toggle behaviour. No carrier frequency, raw timing, button hold or repeat settings are invented. In particular, these imports do not inherit the 38 kHz verification of unrelated records.

The importer deliberately rejects raw signals and unsupported fields. Several raw candidates needed a trailing space that was not present in the source; inventing that gap would change the evidence. They are not included in this decoded-only batch.

## Reproduce the review

From the repository root, with the validation dependencies installed:

```sh
python tools/import_flipper_selection.py --check
python tools/validate.py
python -m unittest discover -s tests -v
```

Without `--check`, the importer regenerates only the ten selected JSON records from their archived sources and reviewed identities. The tests check every label, protocol, address and command, including conversion back to the original four bytes. They also check source hashes, record reproducibility, invalid-input rejection and inclusion in the generated library.

No schema change is required. These records enter the public manifest only after their PR is reviewed and merged, when the existing main-branch publishing workflow rebuilds the library. The developer examples remain separate.
