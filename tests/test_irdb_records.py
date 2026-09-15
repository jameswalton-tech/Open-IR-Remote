"""Compare imported IRDB records with their unchanged source files."""
import csv
import hashlib
import io
import json
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
NOTICE = ('Contains/accesses irdb by Simon Peter and contributors, used under permission.\n'
          'For licensing details and for information on how to contribute to the database, see\n'
          'https://github.com/probonopd/irdb')


class IrdbRecordTests(unittest.TestCase):
    def test_source_fields_archive_and_licence(self):
        found = 0
        for path in (ROOT / 'remotes').glob('**/remote.irr'):
            record = json.loads(path.read_text(encoding='utf-8'))
            archive = record.get('extensions', {}).get('org.openir.sdk.irdb')
            if archive is None:
                continue
            found += 1
            with self.subTest(remote=record['id']):
                data = path.with_name('source.csv').read_bytes()
                self.assertEqual(hashlib.sha256(data).hexdigest(), archive['source_sha256'])
                restored = ''.join(chunk for group in archive['source_text'] for chunk in group)
                self.assertEqual(restored.encode('utf-8'), data)
                rows = list(csv.reader(io.StringIO(restored, newline=''), strict=True))
                self.assertEqual(rows[0], ['functionname', 'protocol', 'device', 'subdevice', 'function'])
                self.assertEqual(len(rows) - 1, len(record['commands']))
                self.assertLessEqual(len(record['commands']), 128)
                mapping = [item for group in archive['rows'] for item in group]
                self.assertEqual(len(mapping), len(record['commands']))
                for ordinal, (row, command, mapped) in enumerate(zip(rows[1:], record['commands'], mapping), 2):
                    self.assertEqual(len(row), 5)
                    self.assertTrue(all(value.strip() for value in row))
                    self.assertEqual(command['labels']['en'], row[0])
                    self.assertEqual(mapped, {'command_id': command['id'], 'source_row': ordinal})
                    self.assertEqual(len(command['signals']), 1)
                    signal = command['signals'][0]
                    self.assertEqual(signal.get('protocol', record.get('defaults', {}).get('protocol')), row[1])
                    self.assertEqual(signal['parameters'], dict(zip(('device', 'subdevice', 'function'), map(int, row[2:]))))
                    self.assertFalse(signal['source_complete'])
                self.assertEqual(record['validation']['status'], 'imported-unverified')
                self.assertIn(NOTICE, record['provenance'][0]['rights'])
                licence = path.with_name('LICENSE.irdb.md').read_bytes().decode('utf-8')
                self.assertEqual(''.join(archive['license_text']), licence)
        self.assertGreater(found, 0)


if __name__ == '__main__':
    unittest.main()
