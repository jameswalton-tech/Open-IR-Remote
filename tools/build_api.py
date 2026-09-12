#!/usr/bin/env python3
"""Build the static v1 API from canonical remote records."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import shutil
import tempfile
import hashlib

ROOT = Path(__file__).resolve().parents[1]
REMOTE_ROOT = ROOT / "remotes"
API_ROOT = ROOT / "docs" / "api" / "v1"
BASE_URL = "https://jameswalton-tech.github.io/Open-IR-Remote/api/v1"


def read_records():
    records = []
    for source in sorted(REMOTE_ROOT.glob("**/remote.irr.json")):
        record = json.loads(source.read_text(encoding="utf-8"))
        record['$schema'] = 'https://jameswalton-tech.github.io/Open-IR-Remote/schema/open-ir-remote-v1.schema.json'
        relative_dir = source.parent.relative_to(REMOTE_ROOT)
        records.append((relative_dir, record))
    return records


def build(destination: Path):
    records = read_records()
    destination.mkdir(parents=True, exist_ok=True)
    remote_destination = destination / "remotes"
    remote_destination.mkdir(parents=True, exist_ok=True)

    entries = []
    complete_records = []
    for relative_dir, record in records:
        record = json.loads(json.dumps(record))
        api_relative = Path("remotes") / relative_dir / "remote.irr.json"
        target = destination / api_relative
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(json.dumps(record, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        if record.get("image"):
            image_name = record["image"]["path"]
            if image_name != 'remote.webp':
                raise ValueError('Image path must be remote.webp')
            shutil.copy2(REMOTE_ROOT / relative_dir / image_name, target.parent / image_name)
        remote = record["remote"]
        record_bytes = target.read_bytes()
        entries.append({
            "id": record["id"],
            "remote_name": remote["name"],
            "manufacturer": remote["manufacturer"],
            "model": remote["model"],
            "variant": remote["variant"],
            "device_types": remote["device_types"],
            "locale": record["locale"],
            "carrier_hz": record.get("defaults", {}).get("carrier_hz"),
            "validation_status": record["validation"]["status"],
            "updated": record["updated"],
            "sha256": hashlib.sha256(record_bytes).hexdigest(),
            "url": f"{BASE_URL}/{api_relative.as_posix()}",
        })
        bundled = json.loads(json.dumps(record))
        if bundled.get('image'):
            bundled['image']['path'] = f'{BASE_URL}/{api_relative.parent.as_posix()}/remote.webp'
        complete_records.append(bundled)

    updated = max((record["updated"] for _, record in records), default=None)
    index = {
        "format": "open-ir-remote-index",
        "api_version": "1",
        "format_version": "1.0.0",
        "updated": updated,
        "remote_count": len(entries),
        "command_count": sum(len(record["commands"]) for _, record in records),
        "library_url": f"{BASE_URL}/library.json",
        "remotes": entries,
    }
    library = {
        "format": "open-ir-remote-library",
        "api_version": "1",
        "format_version": "1.0.0",
        "updated": updated,
        "remote_count": len(complete_records),
        "remotes": complete_records,
    }
    (destination / "index.json").write_text(json.dumps(index, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    (destination / "library.json").write_text(json.dumps(library, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def compare_directories(expected: Path, actual: Path):
    expected_files = {p.relative_to(expected) for p in expected.glob("**/*") if p.is_file()}
    actual_files = {p.relative_to(actual) for p in actual.glob("**/*") if p.is_file()}
    if expected_files != actual_files:
        return False
    return all((expected / rel).read_bytes() == (actual / rel).read_bytes() for rel in expected_files)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="Fail if committed API files are stale")
    args = parser.parse_args()
    if args.check:
        with tempfile.TemporaryDirectory() as temp:
            generated = Path(temp) / "v1"
            build(generated)
            if not compare_directories(generated, API_ROOT):
                raise SystemExit("docs/api/v1 is stale; run python tools/build_api.py")
    else:
        if API_ROOT.exists():
            shutil.rmtree(API_ROOT)
        build(API_ROOT)


if __name__ == "__main__":
    main()
