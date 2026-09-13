"""Compare identical API content in readable, compact and gzip encodings."""
import gzip
import json
from pathlib import Path
from build_api import encode_record

ROOT = Path(__file__).resolve().parents[1]


def main():
    print('File | Readable KiB | Compact KiB | Saved % | Gzip compact KiB')
    for path in sorted((ROOT/'docs/api/v1').rglob('*.json')):
        value = json.loads(path.read_text(encoding='utf-8'))
        pretty = (json.dumps(value, indent=2, ensure_ascii=False)+'\n').encode('utf-8')
        compact = encode_record(value).encode('utf-8')
        compressed = gzip.compress(compact, compresslevel=9, mtime=0)
        print(f'{path.relative_to(ROOT).as_posix()} | {len(pretty)/1024:.2f} | {len(compact)/1024:.2f} | {100*(1-len(compact)/len(pretty)):.1f} | {len(compressed)/1024:.2f}')
    print('Gzip figures are local measurements, not a guarantee of HTTP compression or device RAM usage.')


if __name__ == '__main__':
    main()
