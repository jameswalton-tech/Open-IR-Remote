#!/usr/bin/env python3
"""Validate canonical records and licensed image assets."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
import re
import sys

try:
    from jsonschema import Draft202012Validator, FormatChecker
except ImportError:
    raise SystemExit('Install dependencies: python -m pip install jsonschema pillow')

try:
    from PIL import Image
except ImportError:
    raise SystemExit('Install dependencies: python -m pip install jsonschema pillow')

ROOT = Path(__file__).resolve().parents[1]
ID_PATTERN = re.compile(r"^[a-z0-9]+(?:[.-][a-z0-9]+)*$")
MAX_RECORD_BYTES = 1_048_576
MAX_TIMINGS_PER_SIGNAL = 8192


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError(f"duplicate JSON key {key!r}")
        result[key] = value
    return result


def reject_nonfinite(value):
    raise ValueError(f"{value} is not a JSON number")


def validate_limits(record, errors, context="record"):
    # Container depth counts objects and arrays, with the root object at depth 1.
    pending = [(record, 0)]
    while pending:
        value, parent_depth = pending.pop()
        if isinstance(value, (dict, list)):
            depth = parent_depth + 1
            if depth > 16:
                fail(f"{context}: JSON nesting exceeds 16 containers", errors)
                return False
            children = value.values() if isinstance(value, dict) else value
            pending.extend((child, depth) for child in children)
    return True


def fail(message, errors):
    errors.append(message)


def validate_record(path, errors, validator=None):
    try:
        if path.stat().st_size > MAX_RECORD_BYTES:
            fail(f"{path}: UTF-8 record exceeds 1 MiB", errors)
            return
        record = json.loads(path.read_text(encoding="utf-8"), object_pairs_hook=unique_object, parse_constant=reject_nonfinite)
    except Exception as exc:
        fail(f"{path}: invalid JSON: {exc}", errors)
        return

    if not validate_limits(record, errors, str(path)):
        return
    if validator is None:
        schema = json.loads((ROOT / "schema/open-ir-remote-v1.schema.json").read_text(encoding="utf-8"))
        validator = Draft202012Validator(schema, format_checker=FormatChecker())
    schema_errors = list(validator.iter_errors(record))
    for error in schema_errors:
        location = ".".join(str(part) for part in error.absolute_path)
        fail(f"{path}: schema {location}: {error.message}", errors)
    if schema_errors:
        return

    for key in ("format", "format_version", "updated", "remote", "locale", "commands", "provenance", "validation"):
        if key not in record:
            fail(f"{path}: missing {key}", errors)
    for key in ("record_kind", "id"):
        if not record.get(key):
            fail(f"{path}: missing {key}", errors)
    remote = record.get("remote", {})
    for key in ("name", "manufacturer", "model", "variant", "device_types"):
        if not remote.get(key):
            fail(f"{path}: missing remote.{key}", errors)

    commands = record.get("commands", [])
    if not commands:
        fail(f"{path}: commands must not be empty", errors)
    ids = []
    for command in commands:
        command_id = command.get("id", "")
        if not ID_PATTERN.fullmatch(command_id):
            fail(f"{path}: invalid command id {command_id!r}", errors)
        ids.append(command_id)
        signals = command.get("signals", [])
        if not signals:
            fail(f"{path}: {command_id} has no signal representations", errors)
        if sum(signal.get("primary") is True for signal in signals) != 1:
            fail(f"{path}: {command_id} must have exactly one primary signal", errors)
        for signal in signals:
            effective = {**record.get("defaults", {}), **signal}
            timing_count = sum(len(signal.get(section, [])) for section in ('intro_us', 'repeat_us', 'ending_us'))
            if timing_count > MAX_TIMINGS_PER_SIGNAL:
                fail(f"{path}: {command_id} exceeds {MAX_TIMINGS_PER_SIGNAL} total timings", errors)
            for section in ('intro_us', 'repeat_us', 'ending_us'):
                timings = signal.get(section, [])
                if len(timings) % 2 or any(value <= 0 if i % 2 == 0 else value >= 0 for i, value in enumerate(timings)):
                    fail(f'{path}: {command_id} {section} must alternate positive marks and negative spaces, ending with a space', errors)
            if signal.get("kind") == "decoded" and not effective.get("protocol"):
                fail(f"{path}: {command_id} decoded signal has no protocol", errors)
            if signal.get("kind") == "decoded" and effective.get("protocol") == "unknown" and signal.get("source_complete") is not False:
                fail(f"{path}: {command_id} unknown protocol must set source_complete false", errors)
            if signal.get("kind") == "raw" and not effective.get("carrier_hz"):
                fail(f"{path}: {command_id} raw signal has no carrier_hz", errors)
    if len(ids) != len(set(ids)):
        fail(f"{path}: duplicate command IDs", errors)

    image = record.get("image")
    if image:
        image_path = path.parent / image.get("path", "")
        if image.get('path') != 'remote.webp':
            fail(f'{path}: image path must be remote.webp', errors)
            return
        rights = image.get("rights", {})
        if not rights.get("basis") or not rights.get("holder") or not rights.get("notice"):
            fail(f"{path}: image rights basis, holder and notice are required", errors)
        if not image_path.is_file() or image_path.suffix.lower() != ".webp":
            fail(f"{path}: image must be an existing WebP file", errors)
        else:
            if image_path.stat().st_size > 512_000:
                fail(f"{path}: image exceeds 500 KiB", errors)
            if not (240 <= image.get("width_px", 0) <= 1600 and 240 <= image.get("height_px", 0) <= 1600):
                fail(f"{path}: image dimensions are outside 240–1600 px", errors)
            header = image_path.read_bytes()[:16]
            if not (header.startswith(b"RIFF") and header[8:12] == b"WEBP"):
                fail(f"{path}: image does not contain WebP data", errors)
            if Image is not None:
                with Image.open(image_path) as actual:
                    if (actual.width, actual.height) != (image.get("width_px"), image.get("height_px")):
                        fail(f"{path}: declared image dimensions do not match the file", errors)
            digest = hashlib.sha256(image_path.read_bytes()).hexdigest()
            if digest != image.get("sha256"):
                fail(f"{path}: image SHA-256 mismatch", errors)
            if image_path.stat().st_size != image.get("size_bytes"):
                fail(f"{path}: declared image size does not match the file", errors)
    return record


def main():
    errors = []
    schema = json.loads((ROOT / "schema/open-ir-remote-v1.schema.json").read_text(encoding="utf-8"))
    records = list(ROOT.glob("remotes/**/remote.irr"))
    examples = list(ROOT.glob("examples/**/remote.irr"))
    for folder in ('remotes', 'examples'):
        for obsolete in (ROOT / folder).rglob('*.irr.json'):
            fail(f'{obsolete}: rename this record to use the .irr extension', errors)
    if not records or not examples:
        fail('Expected library records and examples using the .irr extension', errors)
    Draft202012Validator.check_schema(schema)
    published_schema = json.loads((ROOT / "docs/schema/open-ir-remote-v1.schema.json").read_text(encoding="utf-8"))
    if published_schema != schema:
        fail('Published schema differs from the canonical schema', errors)
    validator = Draft202012Validator(schema, format_checker=FormatChecker())
    remote_ids = []
    for path in records + examples:
        instance = validate_record(path, errors, validator)
        if instance is not None and path in records:
            remote_ids.append(instance['id'])
    if len(remote_ids) != len(set(remote_ids)):
        fail('Duplicate remote IDs', errors)
    if errors:
        print("\n".join(errors), file=sys.stderr)
        raise SystemExit(1)
    print(f"Validated {len(records)} library records and {len(examples)} examples.")


if __name__ == "__main__":
    main()
