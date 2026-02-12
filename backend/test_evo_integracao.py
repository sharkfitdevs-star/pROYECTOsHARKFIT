import requests
import json

# Nueva URL base de integración
base_url = 'https://evo-integracao-api.w12app.com.br'
token = 'FB109206-CE01-4160-BCDF-8389B8725276'
headers = {'Authorization': f'Basic {token}'}

print('[INFO] Probando API EVO Integración\n')
print('=' * 70)

# TEST 1: Memberships (v2)
print('\n1. Probando: /api/v2/membership')
print('-' * 70)
try:
    response = requests.get(f'{base_url}/api/v2/membership', headers=headers, timeout=15)
    print(f'Status Code: {response.status_code}')
    
    if response.status_code == 200:
        data = response.json()
        if isinstance(data, list):
            print(f'Total memberships: {len(data)}')
            if data:
                print('\n[EJEMPLO 1] Primera membresía:')
                print(json.dumps(data[0], indent=2, ensure_ascii=False))
        elif isinstance(data, dict):
            memberships = data.get('list', [])
            print(f'Total memberships: {len(memberships)}')
            if memberships:
                print('\n[EJEMPLO 1] Primera membresía:')
                print(json.dumps(memberships[0], indent=2, ensure_ascii=False))
    else:
        print(f'Error: {response.text[:200]}')
except Exception as e:
    print(f'[ERROR] {e}')

# TEST 2: Members Basic (v1)
print('\n\n2. Probando: /api/v1/members/basic')
print('-' * 70)
try:
    response = requests.get(f'{base_url}/api/v1/members/basic', headers=headers, timeout=15)
    print(f'Status Code: {response.status_code}')
    
    if response.status_code == 200:
        data = response.json()
        if isinstance(data, list):
            print(f'Total members: {len(data)}')
            if data:
                # Buscar EDIXON CULTRERA
                for member in data[:50]:  # Primeros 50
                    name = member.get('name', '') or ''
                    if 'EDIXON' in name.upper() or 'CULTRERA' in name.upper():
                        print(f'\n[ENCONTRADO] EDIXON CULTRERA:')
                        print(json.dumps(member, indent=2, ensure_ascii=False))
                        break
                else:
                    print('\n[EJEMPLO] Primer miembro:')
                    print(json.dumps(data[0], indent=2, ensure_ascii=False))
        elif isinstance(data, dict):
            members = data.get('list', [])
            print(f'Total members: {len(members)}')
            if members:
                print('\n[EJEMPLO] Primer miembro:')
                print(json.dumps(members[0], indent=2, ensure_ascii=False))
    else:
        print(f'Error: {response.text[:200]}')
except Exception as e:
    print(f'[ERROR] {e}')

# TEST 3: Members con ID de EDIXON (7827)
print('\n\n3. Probando: /api/v1/members/basic con filtro por ID')
print('-' * 70)
try:
    # Intentar con query params
    response = requests.get(f'{base_url}/api/v1/members/basic?id=7827', headers=headers, timeout=15)
    print(f'Status Code: {response.status_code}')
    
    if response.status_code == 200:
        data = response.json()
        print('\n[RESULTADO]:')
        print(json.dumps(data, indent=2, ensure_ascii=False))
    else:
        print(f'Error: {response.text[:200]}')
except Exception as e:
    print(f'[ERROR] {e}')

# TEST 4: Memberships con filtro
print('\n\n4. Probando: /api/v2/membership con filtros')
print('-' * 70)
try:
    response = requests.get(f'{base_url}/api/v2/membership?idMember=7827', headers=headers, timeout=15)
    print(f'Status Code: {response.status_code}')
    
    if response.status_code == 200:
        data = response.json()
        print('\n[RESULTADO]:')
        print(json.dumps(data, indent=2, ensure_ascii=False))
    else:
        print(f'Error: {response.text[:200]}')
except Exception as e:
    print(f'[ERROR] {e}')

print('\n' + '=' * 70)
print('[CONCLUSION]')
print('Si alguno de estos endpoints funciona, necesitamos actualizar')
print('la URL base en sync_evo.py de:')
print('  https://sharkfitchile.w12app.com.br')
print('a:')
print('  https://evo-integracao-api.w12app.com.br')
print('=' * 70)
