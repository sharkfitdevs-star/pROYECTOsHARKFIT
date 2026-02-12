import requests
import json

base_url = 'https://evo-integracao-api.w12app.com.br'
token = 'FB109206-CE01-4160-BCDF-8389B8725276'

print('[INFO] Probando diferentes métodos de autenticación\n')
print('=' * 70)

# TEST 1: Con headers diferentes
print('\n1. Authorization: Bearer (en lugar de Basic)')
print('-' * 70)
headers_bearer = {'Authorization': f'Bearer {token}'}
try:
    response = requests.get(f'{base_url}/api/v1/members/basic', headers=headers_bearer, timeout=15)
    print(f'Status Code: {response.status_code}')
    if response.status_code == 200:
        print('[OK] Funciona con Bearer!')
        data = response.json()
        print(f'Datos recibidos: {type(data)}')
    else:
        print(f'Response: {response.text[:300]}')
except Exception as e:
    print(f'[ERROR] {e}')

# TEST 2: Como query parameter
print('\n\n2. Token como query parameter')
print('-' * 70)
try:
    response = requests.get(f'{base_url}/api/v1/members/basic?token={token}', timeout=15)
    print(f'Status Code: {response.status_code}')
    if response.status_code == 200:
        print('[OK] Funciona con query param!')
        data = response.json()
        print(f'Datos recibidos: {type(data)}')
    else:
        print(f'Response: {response.text[:300]}')
except Exception as e:
    print(f'[ERROR] {e}')

# TEST 3: Con tenant_id adicional
print('\n\n3. Con tenant_id en query')
print('-' * 70)
headers_basic = {'Authorization': f'Basic {token}'}
try:
    response = requests.get(
        f'{base_url}/api/v1/members/basic',
        headers=headers_basic,
        params={'tenant_id': 'gym-vendify-001'},
        timeout=15
    )
    print(f'Status Code: {response.status_code}')
    if response.status_code == 200:
        print('[OK] Funciona con tenant_id!')
        data = response.json()
        print(f'Datos recibidos: {type(data)}')
    else:
        print(f'Response: {response.text[:300]}')
except Exception as e:
    print(f'[ERROR] {e}')

# TEST 4: Con el DNS original (sharkfitchile) pero endpoints diferentes
print('\n\n4. Usando DNS original con endpoints nuevos')
print('-' * 70)
old_base = 'https://sharkfitchile.w12app.com.br'
headers_basic = {'Authorization': f'Basic {token}'}
try:
    response = requests.get(f'{old_base}/api/v2/membership', headers=headers_basic, timeout=15)
    print(f'Status Code /api/v2/membership: {response.status_code}')
    if response.status_code == 200:
        print('[OK] Este endpoint existe!')
        data = response.json()
        if isinstance(data, list):
            print(f'Total: {len(data)} registros')
        elif isinstance(data, dict):
            print(f'Estructura: {list(data.keys())}')
    else:
        print(f'Response: {response.text[:300]}')
        
    # Probar members/basic
    response2 = requests.get(f'{old_base}/api/v1/members/basic', headers=headers_basic, timeout=15)
    print(f'Status Code /api/v1/members/basic: {response2.status_code}')
    if response2.status_code == 200:
        print('[OK] Este endpoint existe!')
        data = response2.json()
        if isinstance(data, list):
            print(f'Total: {len(data)} registros')
        elif isinstance(data, dict):
            print(f'Estructura: {list(data.keys())}')
    else:
        print(f'Response: {response2.text[:300]}')
except Exception as e:
    print(f'[ERROR] {e}')

# TEST 5: Probar endpoint de members completo (no basic)
print('\n\n5. /api/v1/members (sin /basic)')
print('-' * 70)
try:
    response = requests.get(f'{old_base}/api/v1/members', headers=headers_basic, timeout=15)
    print(f'Status Code: {response.status_code}')
    if response.status_code == 200:
        print('[OK] Este endpoint funciona!')
        data = response.json()
        if isinstance(data, list):
            print(f'Total members: {len(data)}')
            if data:
                print('\n[EJEMPLO] Campos disponibles:')
                print(list(data[0].keys()))
                
                # Buscar EDIXON
                for member in data:
                    name = member.get('name', '') or member.get('firstName', '') or ''
                    if 'EDIXON' in str(name).upper():
                        print(f'\n[ENCONTRADO] EDIXON CULTRERA:')
                        print(json.dumps(member, indent=2, ensure_ascii=False))
                        break
        elif isinstance(data, dict):
            members = data.get('list', [])
            print(f'Total members: {len(members)}')
    else:
        print(f'Response: {response.text[:300]}')
except Exception as e:
    print(f'[ERROR] {e}')

print('\n' + '=' * 70)
