"""V1 conformance checks, including boundary and invalid export cases."""
import copy
import csv
import hashlib
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
import validate as validation_module

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools'))
from validate import validate_record, MAX_RECORD_BYTES
from build_api import build, compare_directories, encode_record
from jsonschema import Draft202012Validator, FormatChecker


class FormatTests(unittest.TestCase):
    def test_obsolete_extension_is_not_silently_skipped(self):
        import shutil
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            for relative in ('schema/open-ir-remote-v1.schema.json', 'docs/schema/open-ir-remote-v1.schema.json', 'examples/example-device/remote.irr'):
                target = root / relative
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(ROOT / relative, target)
            obsolete = root / 'remotes/test/remote.irr.json'
            obsolete.parent.mkdir(parents=True)
            obsolete.write_text(json.dumps(self.record), encoding='utf-8')
            with patch.object(validation_module, 'ROOT', root), patch('sys.stderr') as stderr:
                with self.assertRaises(SystemExit):
                    validation_module.main()
                self.assertIn('rename this record', str(stderr.write.call_args_list))

    def test_compact_encoding_preserves_values(self):
        value = {'label': 'Brightness + / éclair', 'parameters': {'value': 4294967295, 'code_hex': '0x0045'}, 'flags': [True, False]}
        compact = encode_record(value)
        self.assertEqual(json.loads(compact), value)
        self.assertEqual(compact.count('\n'), 1)
        self.assertLess(len(compact.encode('utf-8')), len(json.dumps(value, indent=2, ensure_ascii=False).encode('utf-8')))

    def setUp(self):
        self.record = json.loads((ROOT / 'examples/example-device/remote.irr').read_text(encoding='utf-8'))

    def errors(self, record=None, text=None):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / 'remote.irr'
            path.write_text(text if text is not None else json.dumps(record, ensure_ascii=False), encoding='utf-8', newline='\n')
            errors = []
            validate_record(path, errors)
            return errors

    def test_example_and_inherited_settings(self):
        self.assertFalse(self.errors(self.record))
        for command in self.record['commands']:
            for signal in command['signals']:
                self.assertNotIn('protocol', signal)
                self.assertNotIn('carrier_hz', signal)

    def test_explicit_overrides_and_missing_defaults(self):
        decoded, raw = [c['signals'][0] for c in self.record['commands']]
        decoded['protocol'] = 'NEC'
        raw['carrier_hz'] = 40000
        self.record.pop('defaults')
        self.assertFalse(self.errors(self.record))
        del decoded['protocol']
        self.assertTrue(self.errors(self.record))
        decoded['protocol'] = 'NEC'
        del raw['carrier_hz']
        self.assertTrue(self.errors(self.record))

    def test_unknown_inherited_protocol(self):
        self.record['defaults']['protocol'] = 'unknown'
        self.assertTrue(self.errors(self.record))
        self.record['commands'][0]['signals'][0]['source_complete'] = False
        self.assertFalse(self.errors(self.record))

    def test_unicode_text_boundaries(self):
        for field, limit in [('name',120), ('manufacturer',80), ('model',100), ('variant',80), ('remote_model_number',100)]:
            with self.subTest(field=field):
                record = copy.deepcopy(self.record)
                record['remote'][field] = '\U0001f4a1' * limit
                self.assertFalse(self.errors(record))
                record['remote'][field] += 'x'
                self.assertTrue(self.errors(record))
        self.record['commands'][0]['labels']['en'] = 'x' * 121
        self.assertTrue(self.errors(self.record))

    def test_controlled_device_limits(self):
        self.record['remote']['controlled_devices'] = [{'manufacturer':'x'*80, 'model':'y'*100, 'device_type':'lighting'}]
        self.assertFalse(self.errors(self.record))
        self.record['remote']['controlled_devices'][0]['manufacturer'] += 'x'
        self.assertTrue(self.errors(self.record))

    def test_numeric_boundaries(self):
        params = self.record['commands'][0]['signals'][0]['parameters']
        for value in [-2147483648, 4294967295]:
            params['value'] = value
            self.assertFalse(self.errors(self.record))
        for value in [-2147483649, 4294967296, 1.5]:
            params['value'] = value
            self.assertTrue(self.errors(self.record))
        del params['value']
        params['wide_hex'] = '0xFFFFFFFFFFFFFFFF'
        self.assertFalse(self.errors(self.record))
        params['wide_hex'] = 'not hex'
        self.assertTrue(self.errors(self.record))

    def test_raw_numeric_and_sequence_boundaries(self):
        raw = self.record['commands'][1]['signals'][0]
        raw['intro_us'] = [2147483647, -2147483647]
        self.assertFalse(self.errors(self.record))
        for timings in [[2147483648,-1], [1,-2147483648], [0,-1], [1,1], [1,-1,1]]:
            raw['intro_us'] = timings
            self.assertTrue(self.errors(self.record))

    def test_collection_boundaries(self):
        raw = self.record['commands'][1]['signals'][0]
        raw['intro_us'] = [1,-1] * 2048
        raw['repeat_us'] = [1,-1] * 2048
        self.assertFalse(self.errors(self.record))
        raw['ending_us'] = [1,-1]
        self.assertTrue(self.errors(self.record))
        raw.pop('ending_us')
        raw['intro_us'] += [1,-1]
        self.assertTrue(self.errors(self.record))
        self.record['commands'] = [copy.deepcopy(self.record['commands'][0]) for _ in range(128)]
        for i, command in enumerate(self.record['commands']):
            command['id'] = f'button.{i}'
        self.assertFalse(self.errors(self.record))
        self.record['commands'].append(copy.deepcopy(self.record['commands'][0]))
        self.record['commands'][-1]['id'] = 'button.128'
        self.assertTrue(self.errors(self.record))

    def test_primary_and_payload_rules(self):
        signals = self.record['commands'][0]['signals']
        signals.append(copy.deepcopy(signals[0]))
        self.assertTrue(self.errors(self.record))
        signals[1]['primary'] = False
        self.assertFalse(self.errors(self.record))
        signals.extend([copy.deepcopy(signals[1]), copy.deepcopy(signals[1])])
        self.assertTrue(self.errors(self.record))
        del signals[1:]
        signals[0]['intro_us'] = [1,-1]
        self.assertTrue(self.errors(self.record))

    def test_pronto_boundaries(self):
        self.record['commands'][0]['signals'] = [{'kind':'pronto', 'primary':True, 'source_complete':True, 'pronto_hex':'0000 006D 0000 0000'}]
        self.assertFalse(self.errors(self.record))
        signal = self.record['commands'][0]['signals'][0]
        signal['pronto_hex'] = ' '.join(['0000'] * 8192)
        self.assertFalse(self.errors(self.record))
        signal['pronto_hex'] += ' 0000'
        self.assertTrue(self.errors(self.record))

    def test_bytes_depth_extensions_and_bad_json(self):
        self.assertTrue(self.errors(text=' ' * (MAX_RECORD_BYTES + 1)))
        self.assertTrue(self.errors(text='{"id":"a","id":"b"}'))
        self.assertTrue(self.errors(text='[]'))
        self.assertTrue(self.errors(text='{'))
        text = json.dumps(self.record).replace('0.33', 'NaN')
        self.assertTrue(self.errors(text=text))
        text = json.dumps(self.record)
        self.assertFalse(self.errors(text=text + ' ' * (MAX_RECORD_BYTES-len(text.encode('utf-8')))))
        self.record['extensions'] = {'app':{'enabled':True, 'revision':1}}
        self.assertFalse(self.errors(self.record))
        nested = self.record['extensions']
        for _ in range(17):
            nested['next'] = {}
            nested = nested['next']
        self.assertTrue(self.errors(self.record))

    def test_generation_is_deterministic_lf(self):
        with tempfile.TemporaryDirectory() as temp:
            first, second = Path(temp)/'first', Path(temp)/'second'
            build(first)
            build(second)
            self.assertTrue(compare_directories(first, second))
            for path in list(first.rglob('*.json')) + list(first.rglob('*.irr')):
                self.assertNotIn(b'\r\n', path.read_bytes())
            index = json.loads((first/'index.json').read_text(encoding='utf-8'))
            self.assertEqual(len(list((ROOT/'remotes').rglob('remote.irr'))), index['remote_count'])
            self.assertGreater(index['remote_count'], 0)
            self.assertFalse(list(first.rglob('*.irr.json')))
            for entry in index['remotes']:
                self.assertTrue(entry['url'].endswith('/remote.irr'))
                relative = entry['url'].split('/api/v1/')[1]
                path = first / relative
                self.assertEqual(hashlib.sha256(path.read_bytes()).hexdigest(), entry['sha256'])
                errors = []
                validate_record(path, errors)
                self.assertFalse(errors)
            schema = json.loads((ROOT/'schema/open-ir-remote-v1.schema.json').read_text(encoding='utf-8'))
            validator = Draft202012Validator(schema, format_checker=FormatChecker())
            library = json.loads((first/'library.json').read_text(encoding='utf-8'))
            example_ids = {json.loads(path.read_text(encoding='utf-8'))['id'] for path in (ROOT/'examples').rglob('remote.irr')}
            self.assertTrue(example_ids.isdisjoint(entry['id'] for entry in index['remotes']))
            self.assertTrue(example_ids.isdisjoint(record['id'] for record in library['remotes']))
            for record in library['remotes']:
                self.assertFalse(list(validator.iter_errors(record)))

    def test_seed_csv_readings_match_effective_json(self):
        for path in (ROOT/'remotes').rglob('remote.csv'):
            record = json.loads(path.with_name('remote.irr').read_text(encoding='utf-8'))
            with path.open(encoding='utf-8', newline='') as source:
                rows = list(csv.DictReader(source))
            self.assertEqual(len(rows), len(record['commands']))
            commands = {command['id']:command for command in record['commands']}
            for row in rows:
                command = commands[row['command_id']]
                signal = next(s for s in command['signals'] if s['primary'])
                effective = {**record.get('defaults',{}), **signal}
                self.assertEqual(row['remote_name'], record['remote']['name'])
                self.assertEqual(row['manufacturer'], record['remote']['manufacturer'])
                self.assertEqual(row['remote_model'], record['remote']['model'])
                self.assertEqual(row['button_label'], command['labels'][row['locale']])
                self.assertEqual(row['protocol'], effective['protocol'])
                self.assertEqual(int(row['carrier_hz']), effective['carrier_hz'])
                for key in ['address_hex','command_hex','code_hex']:
                    self.assertEqual(row[key], signal['parameters'][key])

    def test_schema_has_bounded_open_fields(self):
        schema = json.loads((ROOT/'schema/open-ir-remote-v1.schema.json').read_text(encoding='utf-8'))
        pending = [schema]
        while pending:
            node = pending.pop()
            if isinstance(node, list):
                pending.extend(node)
            elif isinstance(node, dict):
                kind = node.get('type')
                key = {'string':'maxLength','array':'maxItems','object':'maxProperties'}.get(kind) if isinstance(kind,str) else None
                # Conditional schemas and property-name constraints need not repeat
                # the bounds on their enclosing instance definition.
                if key and ('properties' in node or 'items' in node or kind == 'string'):
                    self.assertIn(key, node)
                pending.extend(value for key,value in node.items() if key not in ['if','then','not','contains','propertyNames'])


if __name__ == '__main__':
    unittest.main()
