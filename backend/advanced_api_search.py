import requests
import json

base_url = 'https://sharkfitchile.w12app.com.br'
token = 'FB109206-CE01-4160-BCDF-8389B8725276'
headers = {'Authorization': f'Basic {token}'}

print('[INFO] Estrategia alternativa: Documentacion y parametros')
print('=' * 80)

# 1. Buscar documentación de la API
print('\n[1] Buscando endpoints de documentación...\n')
doc_endpoints = [
    '/',
    '/api',
    '/api/v1',
    '/api/v2',
    '/docs',
    '/api/docs',
    '/swagger',
    '/api/swagger',
    '/swagger.json',
    '/api-docs',
    '/openapi.json',
    '/api/v1/docs',
    '/api/v2/docs',
]

for endpoint in doc_endpoints:
    try:
        url = f'{base_url}{endpoint}'
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code == 200:
            print(f'[OK] {endpoint}: {response.status_code}')
            content_type = response.headers.get('content-type', '')
            print(f'     Content-Type: {content_type}')
            if 'json' in content_type:
                try:
                    data = response.json()
                    print(f'     Keys: {list(data.keys())[:10]}')
                except:
                    pass
            elif 'html' in content_type:
                print(f'     HTML detectado (puede ser documentacion web)')
            print()
    except Exception as e:
        pass

# 2. Probar prospects con diferentes parámetros
print('\n[2] Probando /api/v1/prospects con filtros avanzados...\n')

prospect_params = [
    {},  # Sin params
    {'status': 'active'},
    {'status': 'all'},
    {'includeDetails': 'true'},
    {'expand': 'all'},
    {'fields': 'all'},
    {'limit': 1000},
    {'offset': 0, 'limit': 100},
    {'from': '2024-01-01', 'to': '2026-12-31'},
    {'includeInactive': 'true'},
]

for params in prospect_params:
    try:
        response = requests.get(f'{base_url}/api/v1/prospects', headers=headers, params=params, timeout=10)
        if response.status_code == 200:
            data = response.json()
            count = len(data) if isinstance(data, list) else len(data.get('list', []))
            print(f'Params: {params}')
            print(f'  Resultados: {count}')
            if data:
                item = data[0] if isinstance(data, list) else data.get('list', [{}])[0]
                print(f'  Campos: {len(item.keys())} campos')
            print()
    except Exception as e:
        pass

# 3. Probar entries con parámetros
print('\n[3] Probando /api/v1/entries con filtros...\n')

entry_params = [
    {'limit': 1000},
    {'from': '2026-02-01'},
    {'includeMembers': 'true'},
    {'expand': 'member'},
    {'details': 'full'},
]

for params in entry_params:
    try:
        response = requests.get(f'{base_url}/api/v1/entries', headers=headers, params=params, timeout=10)
        if response.status_code == 200:
            data = response.json()
            count = len(data) if isinstance(data, list) else len(data.get('list', []))
            print(f'Params: {params}')
            print(f'  Resultados: {count}')
            if data:
                item = data[0] if isinstance(data, list) else data.get('list', [{}])[0]
                print(f'  Campos disponibles: {list(item.keys())}')
            print()
    except Exception as e:
        pass

# 4. Intentar endpoint "me" o "tenant" para info general
print('\n[4] Probando endpoints de información general...\n')

info_endpoints = [
    '/api/v1/me',
    '/api/v2/me',
    '/api/v1/tenant',
    '/api/v2/tenant',
    '/api/v1/company',
    '/api/v2/company',
    '/api/v1/config',
    '/api/v2/config',
    '/api/v1/info',
    '/api/v2/info',
]

for endpoint in info_endpoints:
    try:
        url = f'{base_url}{endpoint}'
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code == 200:
            print(f'[OK] {endpoint}')
            try:
                data = response.json()
                print(f'     Data: {json.dumps(data, indent=2, ensure_ascii=False)[:500]}')
            except:
                print(f'     Content: {response.text[:200]}')
            print()
    except:
        pass

# 5. Buscar si hay aggregations o counts
print('\n[5] Probando endpoints de agregación/conteo...\n')

agg_endpoints = [
    '/api/v1/prospects/count',
    '/api/v1/entries/count',
    '/api/v1/stats/prospects',
    '/api/v1/stats/entries',
    '/api/v1/aggregations',
    '/api/v2/aggregations',
]

for endpoint in agg_endpoints:
    try:
        url = f'{base_url}{endpoint}'
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code == 200:
            print(f'[OK] {endpoint}')
            print(f'     Data: {response.text[:200]}')
            print()
    except:
        pass

print('\n' + '=' * 80)
print('[CONCLUSION]')
print('Si no encontramos endpoints adicionales, significa que:')
print('1. W12App API es solo para CRM básico (prospects + access logs)')
print('2. Los datos de clientes activos, planes y ventas están en EVO5')
print('3. Necesitamos acceso a la API EVO5 nativa o webhooks')
print('=' * 80)
