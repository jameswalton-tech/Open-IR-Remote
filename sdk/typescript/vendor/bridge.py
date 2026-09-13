"""Thin process boundary; all validation stays in the pinned upstream function."""
import json,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).parent/'tools'))
from validate import validate_record
errors=[]
validate_record(Path(sys.argv[1]),errors)
print(json.dumps(errors))
