"""Thin process boundary; all validation stays in the pinned upstream function."""
import json,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).parent/'tools'))
from format_environment import require_format_helpers
require_format_helpers()
from validate import validate_record
errors=[]
validate_record(Path(sys.argv[1]),errors)
print(json.dumps(errors))
