"""Check that the reviewed source batch survives conversion without lost buttons."""
import copy
import hashlib
import json
from pathlib import Path
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools'))
from import_flipper_selection import load_selection, make_record, parse_source, read_u32
from build_api import build


class FlipperSelectionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.manifest = load_selection()

    def test_reviewed_batch_and_reproducibility(self):
        self.assertEqual(len(self.manifest['entries']), 10)
        total = 0
        for entry in self.manifest['entries']:
            with self.subTest(remote=entry['name']):
                path = ROOT / entry['record_path']
                data = path.with_name('source.ir').read_bytes()
                self.assertEqual(hashlib.sha256(data).hexdigest(), entry['source_sha256'])
                record = json.loads(path.read_text(encoding='utf-8'))
                self.assertEqual(make_record(entry, self.manifest), record)
                blocks = parse_source(data.decode('utf-8-sig'))
                self.assertEqual(len(blocks), len(record['commands']))
                self.assertEqual(record['validation']['status'], 'imported-unverified')
                self.assertNotIn('carrier_hz', record.get('defaults', {}))
                self.assertEqual(len({c['id'] for c in record['commands']}), len(blocks))
                for block, command in zip(blocks, record['commands']):
                    self.assertEqual(command['labels']['en'], block['name'])
                    signal = command['signals'][0]
                    self.assertEqual(signal.get('protocol', record.get('defaults', {}).get('protocol')), block['protocol'])
                    # Reverse the numeric notation to all four original bytes.
                    # This catches endianness errors that schema validation cannot.
                    for field in ('address', 'command'):
                        number = int(signal['parameters'][field + '_hex'], 16)
                        self.assertEqual(number.to_bytes(4, 'little'), bytes.fromhex(block[field]))
                total += len(blocks)
        self.assertEqual(total, 289)

    def test_numeric_boundaries_and_invalid_bytes(self):
        self.assertEqual(read_u32('00 00 00 00'), 0)
        self.assertEqual(read_u32('FF FF FF FF'), 4294967295)
        self.assertEqual(read_u32('12 34 56 78'), 0x78563412)
        for value in ('12 34', 'GG 00 00 00', '100 00 00 00', '-1 00 00 00'):
            with self.subTest(value=value), self.assertRaises(ValueError):
                read_u32(value)

    def test_unsupported_input_is_not_silently_dropped(self):
        valid = 'Filetype: IR signals file\nVersion: 1\nname: Power\ntype: parsed\nprotocol: NEC\naddress: 00 00 00 00\ncommand: 01 00 00 00\n'
        for invalid in (valid.replace('parsed', 'raw'), valid + 'command: 02 00 00 00\n', valid.replace('Version: 1', 'Version: 2'), valid.replace('protocol: NEC\n', ''), valid.replace('name: Power', 'name:')):
            with self.subTest(invalid=invalid), self.assertRaises(ValueError):
                parse_source(invalid)

    def test_record_path_cannot_escape_library(self):
        entry = copy.deepcopy(self.manifest['entries'][0])
        entry['record_path'] = '../outside/remote.irr.json'
        with self.assertRaises(ValueError):
            make_record(entry, self.manifest)

    def test_library_build_includes_each_new_record(self):
        # Build in a temporary directory so tests do not edit the checked-in API.
        with tempfile.TemporaryDirectory() as temp:
            build(Path(temp))
            for entry in self.manifest['entries']:
                source = json.loads((ROOT / entry['record_path']).read_text(encoding='utf-8'))
                published = json.loads((Path(temp) / entry['record_path']).read_text(encoding='utf-8'))
                self.assertEqual(source['commands'], published['commands'])
                self.assertEqual(source['provenance'], published['provenance'])


if __name__ == '__main__':
    unittest.main()
