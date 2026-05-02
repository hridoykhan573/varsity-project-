import requests
import json

# Manual sandbox check
url = "https://tokenized.sandbox.bka.sh/v1.2.0-beta/tokenized/checkout/token/grant"
headers = {
    "Content-Type": "application/json",
    "username": "sandboxTokenizedUser02",
    "password": "sandboxTokenizedUser02@123",
    "x-app-key": "4f1s067iu9133ac4155105m227" # Try lowercase
}
body = {
    "app_key": "4f1s067iu9133ac4155105m227",
    "app_secret": "2926719875fdf867bd6d901ey99"
}

print(f"Testing URL: {url}")
try:
    response = requests.post(url, headers=headers, json=body, timeout=10)
    print(f"Status: {response.status_code}")
    print(f"Body: {response.json()}")
except Exception as e:
    print(f"Error: {e}")
