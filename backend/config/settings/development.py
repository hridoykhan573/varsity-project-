from .base import *

DEBUG = True
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}
# In development, you'll now use SMTP if configured in .env, otherwise it defaults to SMTP (Gmail).
