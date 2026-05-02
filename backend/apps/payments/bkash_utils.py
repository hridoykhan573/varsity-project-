import json
import logging
import requests
from django.conf import settings
from django.core.cache import cache

logger = logging.getLogger(__name__)

# Official paths when BKASH_BASE_URL ends with .../tokenized/checkout:
# - /token/grant
# - /payment/create
# - /execute/{paymentID}
# See https://developer.bka.sh/docs/create-payment and execute-payment


class BKashUtility:
    def __init__(self):
        raw = getattr(
            settings,
            'BKASH_BASE_URL',
            'https://tokenized.sandbox.bka.sh/v1.2.0-beta/tokenized/checkout',
        )
        self.base_url = raw.rstrip('/')
        self.app_key = (getattr(settings, 'BKASH_APP_KEY', '') or '').strip()
        self.app_secret = (getattr(settings, 'BKASH_APP_SECRET', '') or '').strip()
        self.username = (getattr(settings, 'BKASH_USERNAME', '') or '').strip()
        self.password = (getattr(settings, 'BKASH_PASSWORD', '') or '').strip()
        self._last_error = None

    def _parse_json(self, response):
        try:
            return response.json()
        except ValueError:
            text = (response.text or '')[:500]
            logger.error('bKash non-JSON response %s: %s', response.status_code, text)
            return {'statusMessage': f'Invalid response from bKash (HTTP {response.status_code})'}

    def credentials_ok(self):
        return bool(self.app_key and self.app_secret and self.username and self.password)

    def get_token(self):
        """Get or refresh bKash ID token (cached)."""
        self._last_error = None
        if not self.credentials_ok():
            self._last_error = (
                'bKash is not configured: set BKASH_APP_KEY, BKASH_APP_SECRET, '
                'BKASH_USERNAME, and BKASH_PASSWORD in backend/.env from your bKash sandbox app.'
            )
            return None
        token = cache.get('bkash_id_token')
        if token:
            return token

        url = f'{self.base_url}/token/grant'
        headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'username': self.username,
            'password': self.password,
            'x-app-key': self.app_key,
        }
        body = {'app_key': self.app_key, 'app_secret': self.app_secret}

        try:
            response = requests.post(url, headers=headers, json=body, timeout=20)
            data = self._parse_json(response)

            if response.status_code == 200 and data.get('id_token'):
                cache.set('bkash_id_token', data['id_token'], 3300)
                return data['id_token']

            self._last_error = data.get('statusMessage') or data.get('errorMessage') or str(data)
            logger.error(
                'bKash Grant Token Error: Status %s, Body: %s',
                response.status_code,
                data,
            )
            cache.delete('bkash_id_token')
            return None
        except requests.RequestException as e:
            self._last_error = str(e)
            logger.error('bKash Connection Error (get_token): %s', e, exc_info=True)
            cache.delete('bkash_id_token')
            return None

    def create_payment(self, amount, invoice, callback_url):
        """Initiate bKash payment (checkout URL)."""
        token = self.get_token()
        if not token:
            return {
                'statusCode': '9999',
                'statusMessage': self._last_error
                or 'Could not obtain bKash token. Check BKASH_* credentials and network.',
            }

        # Official: .../tokenized/checkout/payment/create
        url = f'{self.base_url}/payment/create'
        headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': token,
            'x-app-key': self.app_key,
        }
        body = {
            'mode': '0011',
            'payerReference': 'PawHub',
            'callbackURL': callback_url,
            'amount': str(amount),
            'currency': 'BDT',
            'intent': 'authorization',
            'merchantInvoiceNumber': str(invoice),
        }

        try:
            response = requests.post(url, headers=headers, json=body, timeout=20)
            data = self._parse_json(response)
            if response.status_code == 200:
                return data
            logger.error(
                'bKash Create Payment Error: Status %s, Body: %s',
                response.status_code,
                data,
            )
            return data
        except requests.RequestException as e:
            logger.error('bKash Create Payment Exception: %s', e, exc_info=True)
            return None

    def execute_payment(self, payment_id):
        """Finalize bKash payment (paymentID in URL path per API docs)."""
        token = self.get_token()
        if not token:
            return None

        url = f'{self.base_url}/execute/{payment_id}'
        headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': token,
            'x-app-key': self.app_key,
        }

        try:
            response = requests.post(url, headers=headers, json={}, timeout=20)
            return self._parse_json(response)
        except requests.RequestException as e:
            logger.error('bKash Execute Payment Error: %s', e)
            return None

    def query_payment(self, payment_id):
        """Verify bKash payment status."""
        token = self.get_token()
        if not token:
            return None

        url = f'{self.base_url}/payment/status'
        headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': token,
            'x-app-key': self.app_key,
        }
        body = {'paymentID': payment_id}

        try:
            response = requests.post(url, headers=headers, json=body, timeout=20)
            return self._parse_json(response)
        except requests.RequestException as e:
            logger.error('bKash Query Payment Error: %s', e)
            return None
