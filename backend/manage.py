#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys
import types

# Global mocks for missing dependencies
def mock_dependency(name):
    if name not in sys.modules:
        m = types.ModuleType(name)
        sys.modules[name] = m
        return m
    return sys.modules[name]

# Mock simple_history
sh = mock_dependency('simple_history')
sh_models = mock_dependency('simple_history.models')
sh.models = sh_models

class HistoricalRecords:
    def __init__(self, *args, **kwargs): pass
    def contribute_to_class(self, cls, name): setattr(cls, name, None)

class HistoricalChanges: pass

sh_models.HistoricalRecords = HistoricalRecords
sh_models.HistoricalChanges = HistoricalChanges

# Mock magic
m = mock_dependency('magic')
m.from_buffer = lambda *args, **kwargs: 'image/jpeg' # Default to jpeg for dev


def main():
    """Run administrative tasks."""
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()
