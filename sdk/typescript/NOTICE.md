# Notices and source pins

This local prototype includes the unmodified Open IR schema and Python validator at revision fb4c569fdf9fdef789cad9c2c4288541cec72e44. Their SHA-256 digests are checked on every build in vendor/PINS.json. The schema/specification is CC0-1.0 according to vendor/DATA-LICENSE.md. The Python software is GPL-3.0 under vendor/LICENSE. This combined local prototype is conservatively labelled GPL-3.0-only; separating a differently licensed core would be a distinct packaging and licensing decision.

Generated browser code contains Ajv and ajv-formats helpers. Their MIT notices are retained in vendor/AJV-LICENSE and vendor/AJV-FORMATS-LICENSE. Ajv is a build dependency, not a runtime package dependency. It compiles a fixed local schema and does not accept remote schemas or enable the $data option.

No irdb data is bundled in the package, examples or tests. All CSV fixtures and signal examples are invented. The importer retains the irdb source notice and licence URL in provenance and keeps the original CSV in a namespaced extension. This does not grant rights to source data or fulfil the upstream terms for a product.

The reviewed [irdb licence](https://github.com/probonopd/irdb/blob/11aa5eb3ad9fec9e5c03f170c29c1467733d9f3e/LICENSE.md) says that product use requires notifying the project by opening an issue before use, including its prescribed notice, and providing up to three fully licensed copies or units at no charge, including shipping and handling, if requested. Its permission is revoked if those terms are not met. The importer preserves this source attribution rather than substituting CC0. No issue or other external message has been sent as part of this prototype.

The prescribed notice is:

> Contains/accesses irdb by Simon Peter and contributors, used under permission.
> For licensing details and for information on how to contribute to the database, see
> https://github.com/probonopd/irdb

Upstream software, source data and generated migration records have different rights. Check the source licence and your product's circumstances before distributing migrated records. This local proof of concept is not a licence clearance.
