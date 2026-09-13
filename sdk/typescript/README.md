# Open IR SDK local prototype

A TypeScript proof of concept for preserving and editing Open IR v1 records, plus a strict irdb CSV importer. The basic path is parse, edit, serialize. It retains the entire record, including stable IDs, translations, provenance, protocol parameters and unknown extensions.

This is suitable for evaluating an editor integration. It is not production-ready or a universal IR playback library. The prototype has no hardware operations.

## Run locally

Use Node 24, npm and Python 3 with the listed Python dependencies. These commands run from this directory. On Windows PowerShell, use npm.cmd if your execution policy blocks npm.ps1.

```sh
npm ci
python -m pip install -r requirements.txt
npm test
npm run example
npm run measure
```

The build creates the dist directory, generated types and standalone validator. Generated files are not committed. JavaScript consumers need no npm runtime dependencies. Building uses pinned development dependencies from package-lock.json. The optional Node validation bridge needs Python and the complete pinned requirements.txt, including date-time and URI format helpers. It does not install them itself.

## Parse, edit and serialize

```ts
import { parse, serialize, OpenIrError } from './dist/index.js';

try {
  // jsonText may also be a Uint8Array containing UTF-8 bytes.
  const record = parse(jsonText);
  record.remote.name = 'A new display name';
  record.commands[0].labels.en = 'A new label';

  // Existing IDs, French labels, provenance and vendor metadata remain intact.
  const compactJson = serialize(record);
} catch (error) {
  if (error instanceof OpenIrError) {
    // Example: /commands/0/signals/0/protocol, schema.required, ...
    console.error(error.issues);
  } else {
    throw error;
  }
}
```

The complete runnable example is examples/quickstart.mjs. Its examples/remote.irr.json contains one decoded representation, one raw representation, a translated label, an unsigned32 parameter, a wider hexadecimal string and an explicit receiver mapping. All readings are synthetic.

`parse` validates a record before returning it. `validate(value)` returns `{ valid, scope, assets, issues }` without throwing for expected invalid input. `serialize` validates again because the caller may have edited the tree. No function regenerates IDs from names. New application-created IDs must be assigned once and persisted by the application.

## Import complete irdb submissions

```ts
import { tryImportIrdb } from './dist/irdb.js';
import { serialize } from './dist/index.js';

const submission = tryImportIrdb(csvText, {
  id: 'oir:example:my-import',
  remote: {
    name: 'Unidentified handset',
    manufacturer: 'Unknown',
    model: 'Unknown',
    variant: 'Unverified',
    device_types: ['other']
  },
  locale: 'en',
  importedAt: '2026-09-13',
  sourcePath: 'codes/example/collection.csv',
  sourceRevision: 'the-immutable-source-revision',
  identityNotes: 'The source path describes a device category. The handset model is unknown.'
});

if (submission.status === 'ignored') {
  // No record is returned. A batch job can count these and display the reasons.
  console.log(submission.diagnostics);
} else {
  const record = submission.result.record;
  const compactJson = serialize(record);
}
```

Only complete, compatible submissions are accepted for now. A file must have the exact `functionname,protocol,device,subdevice,function` header and 1 to 128 data rows. Every row must have five columns, a nonblank label, a nonblank protocol other than literal `unknown`, and explicit decimal device, subdevice and function integers within v1 bounds. One incomplete or malformed row ignores the whole file. Files with more than 128 commands are ignored. There is no partial import, fallback label, automatic grouping, splitting, truncation or deduplication.

Headerless files, duplicate headers and tab-damaged headers are ignored. `parseIrdb` can inspect them, but its optional header interpretation modes cannot make them acceptable to `importIrdb`. Parsed collections are inspection results, not accepted remotes.

CSV accepts quoted commas, embedded newlines, doubled quotes, CRLF, LF and CR record terminators. It preserves exact source text, including numeric spellings such as `0001` and `+002`. Numeric whitespace and decimal fractions are incompatible with this strict profile. Explicit `-1` values are retained as source sentinels, without replacing them or guessing their protocol meaning. A whitespace-only label is incomplete; a nonblank label keeps its original leading and trailing whitespace.

Protocol spelling and variants are unchanged. `NEC1` and `NEC2` stay distinct. The mapped parameters are named `device`, `subdevice` and `function`, with the irdb profile recorded in an extension. They are never conflated with `address_hex`, `command_hex`, frame bits or byte order. Known protocol names alone do not prove a renderer's interpretation.

Accepted rows produce `legacy-import` records with `validation.status: imported-unverified` and `source_complete: false`. Here acceptance means all required source fields were present and representable. It does not certify a complete transmission description. A separate protocol adapter and evidence would be needed before changing that signal claim.

Manufacturer and device-category paths do not identify a physical handset. The caller must supply a persistent record ID, remote description, immutable source revision and a note explaining identity uncertainty. Without caller-provided command IDs, migration assigns `irdb.row.N`, where N is the one-based logical CSV record ordinal, counting the header as row 1. Duplicate rows receive different IDs. These IDs are then stored with the record and survive renames. They are not a cross-revision row-matching algorithm. When reimporting a changed source revision, supply reviewed, persisted `commandIds` keyed by source ordinal.

## Source restoration and information loss

```ts
import { restoreIrdbSource } from './dist/irdb.js';

const restored = restoreIrdbSource(record);
console.log(restored.csv);    // Exact archived source CSV.
console.log(restored.losses); // Always explains that Open IR edits are not exported.
```

The importer archives the entire accepted CSV under `extensions.org.openir.sdk.irdb`. Its `irdb-source-v1` profile contains the header interpretation, exact source text, identity note and command-to-source-row mapping. Strings are split at 1,024 Unicode code points and placed in bounded groups of 64 to respect v1 extension limits. Final record validation checks the archive too. Oversized metadata is an error, never silently removed.

The archive restores decoded UTF-8 source text byte-for-byte for accepted UTF-8 input, including line endings, quotes and numeric spelling. A UTF-8 BOM is not accepted by the strict header. The archive is ordinary mutable record data, not a signed or tamper-evident source record.

`restoreIrdbSource` restores that snapshot even if labels or signals were later edited. Its mandatory `source-snapshot-only` report says that current IDs, translations, metadata, provenance edits and additional signal representations are not exported. It rejects records without a supported archive. There is no general Open IR to irdb CSV exporter because the five-column profile cannot preserve those fields. Accepted imports have an empty loss list because every source row and its original text are retained.

The source licence is retained in provenance. No upstream database rows are included in this SDK's examples or tests. See NOTICE.md for the reviewed irdb terms and the exact notice. This prototype has not performed the licence's external product-notification step.

## Validation, limits and device support

| API | What it checks or returns |
| --- | --- |
| `parse(string or Uint8Array)` | Original UTF-8 byte limit, strict JSON, numeric safeguards, schema and record semantics. Returns a complete editable `OpenIrRecord`. |
| `validate(unknown)` | Schema and record semantics, with byte count based on compact encoding. Returns JSON Pointer issues, `scope: record-only` and image-check status. |
| `serialize(OpenIrRecord)` | Revalidates and returns compact deterministic JSON. It does not apply defaults to the stored record or remove fields. |
| `effectiveSignal(record, signal)` | A deep copy with each signal setting overriding its corresponding record default. Call on validated data. |
| `assessCapabilities(record, accepts)` | Calls a target predicate for every representation. Null means accepted; a string explains rejection. Returns all supported indexes and unsupported paths. |
| `validateFile(path, python?)` from `./dist/node.js` | Runs the pinned Python authority, including local WebP existence, dimensions, size and digest. Returns `scope: record-and-assets`. |
| `parseIrdb(input, options?)` | Returns source text, logical rows, original row text, physical start lines and diagnostics. Does not accept a submission by itself. |
| `importIrdb(collection, identity)` | Rechecks the original source and imports a complete compatible submission, or throws `OpenIrError`. |
| `tryImportIrdb(input, identity)` | The batch-friendly entry point: `accepted` with `ImportResult`, or `ignored` with diagnostics. Unexpected programming failures still throw. |
| `restoreIrdbSource(record)` | Restores only the archived CSV snapshot, with an explicit loss report. |

`Issue` has a JSON Pointer `path`, a stable category `code` and a readable `message`. CSV diagnostics also have a severity. `/rows/0` means the first data row, while `CsvRow.ordinal` counts the original logical record including a header. Physical line numbers are supplied because a quoted record can span multiple lines. Parser offsets are JavaScript character offsets, not byte positions. The Python bridge preserves the authority's own textual errors instead of inventing field paths for image failures.

`OpenIrRecord`, `Signal` and their component types are generated from the pinned schema. They describe required identity, commands, locale, provenance, validation state and optional defaults, image, exporter and extensions. They do not statically enforce numeric ranges, string patterns, counts, one-primary semantics or all conditional payload rules. Runtime validation remains required, including for TypeScript callers. Do not use an `as OpenIrRecord` assertion as validation.

The authority enforces 128 commands and 1 MiB per standalone record. Those are format ceilings, not fixed memory allocations or a device's capacity. Depth is at most 16 object/array containers, counting the root as 1. String limits count Unicode code points, not UTF-16 units, UTF-8 bytes or visual grapheme clusters. The CSV inspection parser has a separate 8 MiB input ceiling chosen by this prototype. That is not a new Open IR standard limit.

Duplicate JSON keys are rejected after escape decoding, including `a` followed by `\u0061`. Nonfinite numbers, cycles, undefined, bigint values, sparse arrays, accessors and non-JSON objects are rejected rather than silently altered. Keys such as `__proto__` remain own data properties. Parsed dictionaries have null prototypes; use Object.hasOwn rather than instance hasOwnProperty methods. Do not pass hostile executable proxies or getters as data; parse external bytes at the boundary.

V1 integer parameters through 4,294,967,295 remain exact JavaScript numbers. Wider hexadecimal strings retain case and leading zeroes; no bitwise coercion is used. A JSON decimal token is rejected if converting it to a JavaScript number changes its exact decimal value. For example, `0.10000000000000001` is rejected, while `0.1` and `1e-1` are accepted. Python accepts the former by rounding, so this SDK deliberately accepts a narrower numeric domain. Values already rounded before being passed as JavaScript numbers cannot be recovered. JSON number spelling is not preserved, but accepted numeric values are. Negative zero is preserved.

Deterministic output sorts object keys by UTF-16 code-unit order, preserves array order and exact strings, performs no Unicode normalization and writes no whitespace or final newline. This is an SDK encoding convention, not a new v1 canonicalization rule or RFC 8785 signature format. It need not match the library builder's byte sequence. The library already supplies compact JSON; this SDK adds checked round trips, useful errors, source retention and adoption helpers.

A missing protocol stays missing and is rejected where required. Nothing assumes NEC. Defaults resolve independently, and explicit null remains invalid. Raw and Pronto representations are retained alongside decoded representations. A default protocol has no decoding significance for raw or Pronto payloads.

The browser validator does not open image files, run a decoder or touch receiver hardware. Capability filtering returns a report and does not project or modify the stored record. Receiver mappings are inert namespaced extension data. The runnable example reads `example.receiver.v1` bindings by command ID but performs no restore. An eventual adapter must separately validate its mapping version, receiver identity, capacity and requested actions before an explicitly authorised operation.

## Dependencies and footprint

Ajv 8.20.0 and ajv-formats 3.0.1 compile the authoritative Draft 2020-12 schema at build time. This avoids writing a competing schema engine. TypeScript 5.9.2 checks the source, json-schema-to-typescript 15.0.4 derives public record types, and esbuild 0.25.9 bundles the standalone validator and helpers. Node types are build-only. The lockfile pins transitive dependencies. The last npm audit reported zero known vulnerabilities.

There are no npm runtime package dependencies. On Node 24.18.0 for Windows, the browser core is about 134 KiB minified and 18.7 KiB gzip. The standalone irdb browser bundle, including the core, is about 139 KiB minified and 20.9 KiB gzip. Most bytes belong to the compiled schema. Do not add those bundle sizes when using a bundler that shares the core module. Exact byte counts, Brotli sizes and sample JSON sizes are in FOOTPRINT.json; use `npm pack --dry-run --json` for the current packed-package size.

The synthetic example changes from 1,905 pretty JSON bytes to 1,207 compact bytes without dropping values. The three-row CSV is 132 bytes, while its migrated compact record with identity, provenance and source archive is 2,121 bytes. Preserving evidence costs space. These are serialization and transfer measurements, not browser heap measurements or device RAM guarantees.

## Evidence and remaining limits

The build checks SHA-256 pins for the copied authority at revision fb4c569fdf9fdef789cad9c2c4288541cec72e44. The schema and Python validator are unmodified. Twenty-two test groups pass in the repository, including 119 synthetic acceptance cases compared directly with Python, explicit numeric divergence, source restoration, image checks and browser bundles executed without Node globals and a byte-for-byte check against the repository authority. The browser smoke test is an isolated JavaScript context, not a cross-browser matrix or a hardware test.

The browser uses explicit calendar and timestamp checks matching the pinned Python helpers; URI checks use ajv-formats. The Python bridge requires the pinned format helpers and fails as an environment error if they are missing or the wrong version. The differential corpus covers the review's year-zero, timestamp separator, offset, leap-second and terminal-newline cases, but is not an exhaustive proof of URI-format parity. Use validateFile when the exact authority decision and image checks are required. The standard's Python validator itself is the reference for that claim.

The JSON reader is hand-written to detect duplicates and numeric loss before JSON.parse would erase evidence. Its tests are bounded regression coverage, not a completed fuzzing or security audit. Large in-memory JavaScript objects are serialized for checking and can consume more RAM than the wire size; the prototype is not a streaming parser. Image I/O or corrupt-image exceptions raised by Python reject the Node promise as execution failures and must be handled by its caller.

Recommendation: evaluate this API in a local editor using the original record as the export source of truth. Keep the irdb whole-submission policy until broader import workflows are explicitly wanted. Before production adoption, fuzz the parsers, broaden validator differential tests and real-browser coverage, settle packaging/licensing for the intended product, and build separate evidence-backed protocol adapters. No schema change or large signal engine was needed for this proof of concept.


A separate read-only audit of irdb revision 11aa5eb3ad9fec9e5c03f170c29c1467733d9f3e examined 3,244 files. The strict policy accepted 2,893 complete submissions and ignored 351. All 2,893 transient migration records passed the pinned Python validator. Audit records used explicit unknown handset identity and were discarded after validation. No upstream data is bundled here. To reproduce against your own authorised local checkout:

```sh
node scripts/audit-irdb.mjs /path/to/irdb-checkout
```

The script prints counts only. Of the 351 ignored files, 308 first failed on blank labels, 35 on command count, five on headers, one on column count and two on strict quote syntax. These are reported rejection categories, not independent inventory totals: the inventory contains 68 oversized files, with some already rejected for incomplete rows. No oversized file is accepted.
