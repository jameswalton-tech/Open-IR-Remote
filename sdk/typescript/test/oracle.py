"""Batch conformance oracle. Temporary files are synthetic and never enter fixtures."""
import json,sys,tempfile
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'vendor/tools'))
from validate import validate_record
from jsonschema import Draft202012Validator,FormatChecker
schema=json.loads((Path(__file__).resolve().parents[1]/'vendor/schema/open-ir-remote-v1.schema.json').read_text())
validator=Draft202012Validator(schema,format_checker=FormatChecker())
results=[]
with tempfile.TemporaryDirectory() as tmp:
    path=Path(tmp)/'remote.irr.json'
    for text in json.load(sys.stdin):
        path.write_bytes(text.encode('utf-8'))
        errors=[]
        validate_record(path,errors,validator)
        results.append(errors)
print(json.dumps(results))
