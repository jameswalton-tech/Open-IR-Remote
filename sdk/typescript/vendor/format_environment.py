"""Require the pinned format helpers instead of allowing jsonschema to skip checks."""
from importlib.metadata import version, PackageNotFoundError


def require_format_helpers():
    """Fail as an environment error before a record can be reported as valid."""
    expected = {'jsonschema': '4.25.1', 'rfc3339-validator': '0.1.4', 'rfc3987': '1.3.8'}
    for package, pinned in expected.items():
        try:
            installed = version(package)
        except PackageNotFoundError as error:
            raise RuntimeError(f'Missing {package}; install the SDK requirements.txt') from error
        if installed != pinned:
            raise RuntimeError(f'{package} must be {pinned}, found {installed}; install the SDK requirements.txt')
    # An import also detects a broken installation whose metadata happens to exist.
    import rfc3339_validator
    import rfc3987
    from jsonschema import FormatChecker
    for name in ('date', 'date-time', 'uri'):
        if name not in FormatChecker.checkers:
            raise RuntimeError(f'Python format check {name} is unavailable')
