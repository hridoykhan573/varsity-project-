import os
import django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from django.template.loader import render_to_string
try:
    render_to_string('admin/products/product/buyers.html')
except Exception as e:
    import traceback
    traceback.print_exc()
