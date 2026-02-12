"""
Test de endpoints disponibles en API de Integración EVO
"""

import requests
from requests.auth import HTTPBasicAuth

DNS = 'sharkfitchile'
TOKEN = '654E1165-F181-402E-9DA8-A307FEAF727F'
BASE_URL = 'https://evo-integracao.w12app.com.br'

# Endpoints documentados en https://api.abcevo.com/
ENDPOINTS_TO_TEST = [
    '/api/v1/members',  # ⭐ Este es el IMPORTANTE
    '/api/v1/members/summary-excel',  # Todos los clientes en Excel
    '/api/v1/memberships',  # Planes/contratos
    '/api/v1/sales',
    '/api/v1/prospects',
    '/api/v1/entries',  # Probablemente no existe aquí
    '/api/v1/receivables/summary-excel',  # Pagos
    '/api/v1/managment/not-renewed',  # Planes no renovados
]

session = requests.Session()
session.auth = HTTPBasicAuth(DNS, TOKEN)
session.headers.update({
    'Content-Type': 'application/json',
    'Accept': 'application/json',
})

print('=' * 80)
print('TEST INTEGRATION API - Endpoints Disponibles')
print('=' * 80)
print(f'Base URL: {BASE_URL}')
print(f'DNS: {DNS}')
print('=' * 80)
print()

for endpoint in ENDPOINTS_TO_TEST:
    url = f'{BASE_URL}{endpoint}'
    try:
        response = session.get(url, timeout=10)
        
        if response.status_code == 200:
            try:
                data = response.json()
                count = len(data) if isinstance(data, list) else 'N/A'
                print(f'✅ {endpoint:50} | Status: 200 | Count: {count}')
            except:
                print(f'✅ {endpoint:50} | Status: 200 | Non-JSON response')
        elif response.status_code == 401:
            print(f'🔒 {endpoint:50} | Status: 401 UNAUTHORIZED')
        elif response.status_code == 403:
            print(f'⛔ {endpoint:50} | Status: 403 FORBIDDEN')
        elif response.status_code == 404:
            print(f'❌ {endpoint:50} | Status: 404 NOT FOUND')
        else:
            print(f'⚠️ {endpoint:50} | Status: {response.status_code}')
            
    except requests.exceptions.RequestException as e:
        print(f'💥 {endpoint:50} | Error: {str(e)[:30]}')

print()
print('=' * 80)
print('✅ = Disponible | ❌ = No existe | ⛔ = Sin permisos | 🔒 = Auth error')
print('=' * 80)
