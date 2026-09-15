"""Keep the 24-key import tied to its archived ESPHome definitions."""
from collections import Counter
import hashlib
import json
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]
REMOTE = ROOT / 'remotes/generic/rgb-led-24-key/esphome-ef00'


class RgbLedSourceTests(unittest.TestCase):
    def setUp(self):
        self.record = json.loads((REMOTE / 'remote.irr.json').read_text(encoding='utf-8'))

    def test_archived_source_hash(self):
        source = (REMOTE / 'source/esphome_rgb_led_remote.yaml').read_bytes()
        expected = self.record['extensions']['org.openir.source']['sha256']
        self.assertEqual(hashlib.sha256(source).hexdigest(), expected)

    def test_every_source_definition_is_preserved(self):
        # This reads the fixed archived layout, not arbitrary YAML or its !secret
        # tags. A changed layout must fail review rather than silently lose keys.
        text = (REMOTE / 'source/esphome_rgb_led_remote.yaml').read_text(encoding='utf-8')
        blocks = text.split('  - platform: remote_receiver')[1:]
        self.assertEqual(len(blocks), 24)
        expected = []
        for block in blocks:
            name = re.search(r'^    name: "([^"]+)"', block, re.MULTILINE)
            address = re.search(r'^      address: (0x[0-9A-Fa-f]+)', block, re.MULTILINE)
            command = re.search(r'^      command: (0x[0-9A-Fa-f]+)', block, re.MULTILINE)
            self.assertIsNotNone(name)
            self.assertIsNotNone(address)
            self.assertIsNotNone(command)
            expected.append((name[1], int(address[1], 16), int(command[1], 16)))
        actual = []
        self.assertEqual(len(self.record['commands']), 24)
        for command in self.record['commands']:
            self.assertEqual(len(command['signals']), 1)
            signal = command['signals'][0]
            self.assertEqual(signal.get('protocol', self.record['defaults']['protocol']), 'NEC')
            params = signal['parameters']
            self.assertEqual(params['parameter_profile'], 'esphome-nec-16bit')
            actual.append((command['labels']['en'], int(params['address_hex'], 16), int(params['command_hex'], 16)))
        # A multiset preserves both GREEN entries and catches dropped duplicates.
        self.assertEqual(Counter(actual), Counter(expected))
        self.assertEqual(len({c['id'] for c in self.record['commands']}), 24)

    def test_review_does_not_claim_hardware_or_image_licence_verification(self):
        self.assertEqual(self.record['validation']['status'], 'imported-unverified')
        self.assertNotIn('carrier_hz', self.record['defaults'])
        self.assertEqual(self.record['image']['rights']['basis'], 'identification-only')
        self.assertIn('not identified', self.record['image']['rights']['holder'])


if __name__ == '__main__':
    unittest.main()
