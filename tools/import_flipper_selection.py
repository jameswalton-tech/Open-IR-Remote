"""Reproduce the selected decoded Flipper listings from their archived sources.

This is a reviewed batch importer, not a general raw-signal converter. Unsupported
input fails instead of silently omitting a button or inventing a trailing gap.
Existing records own handset identities; equipment model names are not used
as handset model numbers unless the source explicitly identifies them that way.
"""
import argparse
import hashlib
import json
import re
from pathlib import Path
from urllib.parse import quote, unquote

ROOT = Path(__file__).resolve().parents[1]


def load_selection():
    entries = []
    manifests = set()
    repository = 'https://github.com/Lucaslhm/Flipper-IRDB'
    for source in sorted((ROOT / 'remotes').glob('**/source.ir')):
        path = source.with_name('remote.irr.json')
        record = json.loads(path.read_text(encoding='utf-8'))
        provenance = [p for p in record['provenance'] if p.get('source_path', '').startswith(repository + '/blob/')]
        if not provenance:
            continue
        if len(provenance) != 1:
            raise ValueError(f'Ambiguous source provenance: {path}')
        evidence = provenance[0]
        revision = evidence['source_revision']
        prefix = f'{repository}/blob/{revision}/'
        if not evidence['source_path'].startswith(prefix):
            raise ValueError(f'Source revision mismatch: {path}')
        added = re.search(r'File introduced in ([0-9a-f]{40}) after', evidence['notes'])
        fingerprint = re.search(r'SHA-256: ([0-9a-f]{64})', evidence['notes'])
        if not added or not fingerprint:
            raise ValueError(f'Missing source evidence: {path}')
        remote = record['remote']
        devices = remote.get('controlled_devices', [])
        entries.append({
            'record_path': path.relative_to(ROOT).as_posix(),
            'source_path': unquote(evidence['source_path'][len(prefix):]),
            'source_sha256': fingerprint[1],
            'introduced_commit': added[1],
            'manufacturer': remote['manufacturer'],
            'model': remote['model'],
            'name': remote['name'],
            'device_type': remote['device_types'][0],
            'controlled_model': devices[0]['model'] if devices else None,
        })
        manifests.add((revision, evidence['imported_at']))
    if len(manifests) != 1:
        raise ValueError('Expected one reviewed source snapshot')
    revision, imported_at = manifests.pop()
    return {'repository': repository, 'revision': revision, 'imported_at': imported_at, 'entries': entries}


def parse_source(text):
    """Read complete named records, rejecting ambiguous or duplicate fields."""
    header, blocks, current = {}, [], None
    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        if ':' not in line:
            raise ValueError(f'Invalid source line: {line}')
        key, value = [part.strip() for part in line.split(':',1)]
        if key == 'name':
            current = {}
            blocks.append(current)
        owner = header if current is None else current
        if key in owner:
            raise ValueError(f'Duplicate source field: {key}')
        owner[key] = value
    if header != {'Filetype':'IR signals file','Version':'1'}:
        raise ValueError('Unsupported source header')
    if not 1 <= len(blocks) <= 128:
        raise ValueError('Expected 1 to 128 commands')
    for block in blocks:
        if set(block) != {'name','type','protocol','address','command'} or block['type'] != 'parsed':
            raise ValueError('Only complete decoded records are supported in this selection')
        if not block['name'] or not block['protocol']:
            raise ValueError('Missing button label or protocol')
    return blocks


def read_u32(value):
    """Decode the four little-endian bytes stored by Flipper firmware.

    This changes the storage notation, not the protocol's transmitted bit order.
    Retaining source.ir lets a reviewer independently reproduce all four bytes.
    """
    if not re.fullmatch(r'[0-9A-Fa-f]{2}( [0-9A-Fa-f]{2}){3}',value):
        raise ValueError('Expected four space-separated hexadecimal bytes')
    return int.from_bytes(bytes.fromhex(value),'little')


def make_record(entry, manifest):
    """Preserve each source button and attach explicit source and test status."""
    path = ROOT / entry['record_path']
    if not path.resolve().is_relative_to((ROOT/'remotes').resolve()):
        raise ValueError('Record path is outside remotes')
    source = path.with_name('source.ir').read_bytes()
    if hashlib.sha256(source).hexdigest() != entry['source_sha256']:
        raise ValueError('Archived source hash differs from the selection')
    blocks = parse_source(source.decode('utf-8-sig'))
    commands, used = [], set()
    for block in blocks:
        base = re.sub('[^a-z0-9]+','.',block['name'].lower()).strip('.')
        if not base:
            raise ValueError('A reviewed command ID is required for this label')
        # Duplicate printed labels can represent distinct source signals. Keep
        # both in source order and assign a stable suffix for this initial import.
        key, suffix = base, 2
        while key in used:
            key = f'{base}.{suffix}'
            suffix += 1
        used.add(key)
        commands.append({'id':key,'labels':{'en':block['name']},'signals':[{
            'kind':'decoded','protocol':block['protocol'],
            'parameters':{'address_hex':f"0x{read_u32(block['address']):08X}",'command_hex':f"0x{read_u32(block['command']):08X}"},
            'primary':True,'source_complete':True}]})
    protocols = {b['protocol'] for b in blocks}
    remote = {k:entry[k] for k in ['name','manufacturer','model']}
    remote.update(variant='default',device_types=[entry['device_type']])
    issues = ['Imported decoded parameters have not been tested on hardware by Open IR contributors. Protocol names and packed parameters follow the source Flipper convention; target adapters must support that convention. No carrier frequency was measured or inferred.']
    if entry['model'] == 'Unknown':
        issues.append('The source identifies the controlled equipment, not a printed handset model number.')
    else:
        remote['remote_model_number'] = entry['model']
    if entry['controlled_model']:
        remote['controlled_devices'] = [{'manufacturer':entry['manufacturer'],'model':entry['controlled_model'],'device_type':entry['device_type']}]
    if 'Hilton' in entry['name']:
        issues.append('Upstream describes a Connected Room edge computer, not direct control of every hotel TV. Hilton is a service brand here; handset manufacturer and model are unknown. Compatibility with other rooms is not established.')
    if entry['manufacturer'] == 'Nakamichi':
        issues.append('The source calls this RM-4TA but does not clearly distinguish handset and equipment identity. The handset model is left unknown pending confirmation.')
    if entry['manufacturer'] == 'Dimplex':
        issues.append('This source has only fire on/off commands. Its comments list several Optiflame models; compatibility and any other functions remain unverified.')
    if entry['controlled_model'] == 'ZH3':
        issues.append('Source spells the brand Fossi Audio. Display spelling is normalized to Fosi Audio using the manufacturer link preserved in source.ir.')
    if len({b['name'] for b in blocks}) != len(blocks):
        issues.append('Repeated source labels are retained as distinct commands with stable numeric ID suffixes.')
    parts = path.relative_to(ROOT/'remotes').parts
    url = f"{manifest['repository']}/blob/{manifest['revision']}/{quote(entry['source_path'],safe='/')}"
    record = {'$schema':'../../../../schema/open-ir-remote-v1.schema.json','format':'open-ir-remote','format_version':'1.0.0','record_kind':'canonical','id':f'oir:{parts[0]}:{parts[1]}:default','updated':manifest['imported_at'],'remote':remote,'locale':'en','commands':commands,
        'provenance':[{'source_type':'upstream-reference','source_path':url,'source_revision':manifest['revision'],'imported_at':manifest['imported_at'],'rights':'CC0-1.0','notes':f"Flipper-IRDB contributors. File introduced in {entry['introduced_commit']} after the upstream CC0 cutoff. Original source.ir SHA-256: {entry['source_sha256']}. Source comments are preserved in source.ir. No image rights are asserted."}],
        'validation':{'status':'imported-unverified','issues':issues},
        'extensions':{'flipper':{'file_version':1,'parameter_encoding':'Four little-endian source bytes converted to unsigned numeric hexadecimal; protocol names unchanged.'}}}
    if len(protocols) == 1:
        record['defaults'] = {'protocol':next(iter(protocols))}
        for command in commands:
            del command['signals'][0]['protocol']
    return record


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check',action='store_true',help='Check reproducibility without writing records')
    args = parser.parse_args()
    manifest = load_selection()
    for entry in manifest['entries']:
        path = ROOT/entry['record_path']
        record = make_record(entry,manifest)
        if args.check:
            if json.loads(path.read_text(encoding='utf-8')) != record:
                raise SystemExit(f'Record differs from its source conversion: {path}')
        else:
            path.write_text(json.dumps(record,indent=2,ensure_ascii=False)+'\n',encoding='utf-8',newline='\n')
        print(f"{record['remote']['name']}: {len(record['commands'])} commands")


if __name__ == '__main__':
    main()
