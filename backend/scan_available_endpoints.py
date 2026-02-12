import requests
import json

base_url = 'https://sharkfitchile.w12app.com.br'
token = 'FB109206-CE01-4160-BCDF-8389B8725276'
headers = {'Authorization': f'Basic {token}'}

print('[INFO] Verificando endpoints disponibles\n')
print('=' * 70)

# Lista de endpoints comunes en APIs EVO
endpoints_to_test = [
    # Members/Customers
    '/api/v1/members',
    '/api/v2/members',
    '/api/v1/members/basic',
    '/api/v1/customers',
    
    # Memberships/Plans
    '/api/v1/memberships',
    '/api/v2/memberships',
    '/api/v1/membership',
    '/api/v2/membership',
    '/api/v1/plans',
    '/api/v2/plans',
    
    # Sales (ya probado pero reconfirmar)
    '/api/v1/sales',
    '/api/v2/sales',
    
    # Contracts
    '/api/v1/contracts',
    '/api/v2/contracts',
    
    # Subscriptions
    '/api/v1/subscriptions',
    '/api/v2/subscriptions',
]

available_endpoints = []

for endpoint in endpoints_to_test:
    try:
        url = f'{base_url}{endpoint}'
        response = requests.get(url, headers=headers, timeout=10)
        status = response.status_code
        
        if status == 200:
            print(f'[OK] {endpoint}: {status}')
            available_endpoints.append(endpoint)
            
            # Mostrar estructura de respuesta
            try:
                data = response.json()
                if isinstance(data, list):
                    print(f'     Tipo: Lista con {len(data)} elementos')
                    if data:
                        print(f'     Campos: {list(data[0].keys())}')
                elif isinstance(data, dict):
                    if 'list' in data:
                        items = data.get('list', [])
                        print(f'     Tipo: Dict con list de {len(items)} elementos')
                        if items:
                            print(f'     Campos: {list(items[0].keys())}')
                    else:
                        print(f'     Tipo: Dict con keys: {list(data.keys())[:10]}')
            except:
                pass
            print()
        elif status == 404:
            print(f'[404] {endpoint}')
        elif status == 401:
            print(f'[AUTH] {endpoint}: Requiere autenticación diferente')
        else:
            print(f'[{status}] {endpoint}')
    except Exception as e:
        print(f'[ERROR] {endpoint}: {str(e)[:50]}')

print('\n' + '=' * 70)
print('[RESUMEN]')
print(f'Endpoints disponibles: {len(available_endpoints)}')
for ep in available_endpoints:
    print(f'  - {ep}')

if not available_endpoints:
    print('\n[NOTA IMPORTANTE]')
    print('No se encontraron endpoints adicionales de memberships/members.')
    print('Esto sugiere que:')
    print('  1. La API W12App solo expone prospects, sales y entries')
    print('  2. Las membresías están en el sistema EVO5 nativo (no en W12App)')
    print('  3. Necesitamos acceso directo a EVO5 para ver planes activos')
    print('\nPara EDIXON CULTRERA:')
    print('  - Tiene acceso registrado (access_logs)')
    print('  - No tiene ventas recientes (no en W12App)')
    print('  - Su plan probablemente fue creado antes de W12App')
    print('  - Necesitas consultar en el panel EVO5 directamente')

print('=' * 70)
