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


def fail(message, errors):
    errors.append(message)


def validate_record(path, errors):
    try:
        record = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        fail(f"{path}: invalid JSON: {exc}", errors)
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
            for section in ('intro_us', 'repeat_us', 'ending_us'):
                timings = signal.get(section, [])
                if len(timings) % 2 or any(value <= 0 if i % 2 == 0 else value >= 0 for i, value in enumerate(timings)):
                    fail(f'{path}: {command_id} {section} must alternate positive marks and negative spaces, ending with a space', errors)
            if signal.get("kind") == "decoded" and not signal.get("protocol"):
                fail(f"{path}: {command_id} decoded signal has no protocol", errors)
            if signal.get("protocol") == "unknown" and signal.get("source_complete") is not False:
                fail(f"{path}: {command_id} unknown protocol must set source_complete false", errors)
            if signal.get("kind") == "raw" and not signal.get("carrier_hz"):
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
                fail(f"{path}: image exceeds 512,000 bytes", errors)
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


def main():
    errors = []
    schema = json.loads((ROOT / "schema/open-ir-remote-v1.schema.json").read_text(encoding="utf-8"))
    records = list(ROOT.glob("remotes/**/remote.irr.json"))
    examples = list(ROOT.glob("examples/**/remote.irr.json"))
    remote_ids = [json.loads(p.read_text(encoding='utf-8')).get('id') for p in records]
    if len(remote_ids) != len(set(remote_ids)):
        fail('Duplicate remote IDs', errors)
    for path in records + examples:
        validate_record(path, errors)
        if Draft202012Validator is not None:
            instance = json.loads(path.read_text(encoding="utf-8"))
            validator = Draft202012Validator(schema, format_checker=FormatChecker())
            for error in validator.iter_errors(instance):
                location = ".".join(str(part) for part in error.absolute_path)
                fail(f"{path}: schema {location}: {error.message}", errors)
    if errors:
        print("\n".join(errors), file=sys.stderr)
        raise SystemExit(1)
    print(f"Validated {len(records)} library records and {len(examples)} examples.")


if __name__ == "__main__":
    main()
