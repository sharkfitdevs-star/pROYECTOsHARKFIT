import os
import requests

DEFAULT_BASE = os.environ.get('MONGO_BRIDGE_URL', 'http://localhost:3000')
DEFAULT_TIMEOUT = 5

class BridgeError(Exception):
    pass

class DjangoMongoBridgeClient:
    def __init__(self, base_url=None, timeout=DEFAULT_TIMEOUT):
        self.base = (base_url or DEFAULT_BASE).rstrip('/')
        self.timeout = timeout

    def _get(self, path, params=None):
        url = f"{self.base}{path}"
        try:
            res = requests.get(url, params=params or {}, timeout=self.timeout)
            res.raise_for_status()
            return res.json()
        except requests.RequestException as e:
            raise BridgeError(str(e))

    def get_client_by_id(self, client_id):
        # Returns the `data` payload (or None)
        payload = self._get(f"/api/clientes/{client_id}")
        return payload.get('data') if isinstance(payload, dict) else None

    def list_clients(self, **filters):
        payload = self._get('/api/clientes', params=filters)
        return payload.get('data') if isinstance(payload, dict) else []

    def get_sale_by_id(self, sale_id):
        payload = self._get(f"/api/ventas/{sale_id}")
        return payload.get('data') if isinstance(payload, dict) else None

    def list_sales(self, **filters):
        payload = self._get('/api/ventas', params=filters)
        return payload.get('data') if isinstance(payload, dict) else []

# Convenience default client
default_client = DjangoMongoBridgeClient()
