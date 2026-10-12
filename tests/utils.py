"""Shared test helpers."""

from pathlib import Path

# Directory containing this file.  Tests look here for input files such as
# tests/testdata/eslint.config.js.
TEST_DIR = Path(__file__).parent


def replace_fields(obj, key, value):
    """Recursively find occurrences of 'key' and replace value with 'value'."""
    if isinstance(obj, dict):
        for k, v in obj.items():
            if k == key:
                obj[k] = value
            else:
                replace_fields(v, key, value)
    elif isinstance(obj, list):
        for item in obj:
            replace_fields(item, key, value)
