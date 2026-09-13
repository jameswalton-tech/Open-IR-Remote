# Open IR Remote

Open IR Remote v1 is an open interchange standard and community library for infrared remote-control codes. Records use `format_version: "1.0.0"`.

## Start here

- [Format reference](Format-Reference)
- [Add a remote](Adding-a-Remote)
- [API usage](API-Usage)
- [Complete example device](https://github.com/jameswalton-tech/Open-IR-Remote/blob/main/examples/example-device/remote.irr.json)

Applications can use the static v1 API without an account or API key. Contributors add and verify remotes through pull requests.

## Thanks to irdb

Credit to [irdb](https://github.com/probonopd/irdb), probonopd and its contributors for their compact, community-maintained decoded-code database. It is a valuable resource for signal lookup and reuse. Open IR Remote focuses on self-contained transfer between applications and devices, where handset identity and optional receiver bindings need to travel alongside the codes. An irdb integration can also support transfers with suitable metadata and mappings; this is a difference in scope, not a claim that one format fits every job.

Read the [comparison and acknowledgement](https://github.com/jameswalton-tech/Open-IR-Remote/blob/main/docs/COMPACTNESS.md). No affiliation or endorsement is implied.
