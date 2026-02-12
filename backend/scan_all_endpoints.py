import requests
import json
from concurrent.futures import ThreadPoolExecutor, as_completed

base_url = 'https://sharkfitchile.w12app.com.br'
token = 'FB109206-CE01-4160-BCDF-8389B8725276'
headers = {'Authorization': f'Basic {token}'}

print('[INFO] Escaneo exhaustivo de API EVO W12App')
print('Buscando: clientes, leads, ventas, planes, estadisticas\n')
print('=' * 80)

# Lista completa de endpoints a probar
endpoints_to_test = [
    # Ya confirmados que funcionan
    '/api/v1/prospects',
    '/api/v1/entries',
    
    # Clientes/Members
    '/api/v1/clients',
    '/api/v2/clients',
    '/api/v1/customers',
    '/api/v2/customers',
    '/api/v1/people',
    '/api/v2/people',
    '/api/v1/users',
    '/api/v2/users',
    
    # Leads
    '/api/v1/leads',
    '/api/v2/leads',
    '/api/v1/opportunities',
    '/api/v2/opportunities',
    
    # Ventas/Sales
    '/api/v1/sales',
    '/api/v2/sales',
    '/api/v1/transactions',
    '/api/v2/transactions',
    '/api/v1/orders',
    '/api/v2/orders',
    '/api/v1/purchases',
    '/api/v2/purchases',
    
    # Contratos/Membresías
    '/api/v1/contracts',
    '/api/v2/contracts',
    '/api/v1/agreements',
    '/api/v2/agreements',
    '/api/v1/enrollments',
    '/api/v2/enrollments',
    '/api/v1/registrations',
    '/api/v2/registrations',
    
    # Planes
    '/api/v1/plans',
    '/api/v2/plans',
    '/api/v1/packages',
    '/api/v2/packages',
    '/api/v1/products',
    '/api/v2/products',
    '/api/v1/services',
    '/api/v2/services',
    
    # Estadísticas/Dashboard
    '/api/v1/dashboard',
    '/api/v2/dashboard',
    '/api/v1/stats',
    '/api/v2/stats',
    '/api/v1/statistics',
    '/api/v2/statistics',
    '/api/v1/analytics',
    '/api/v2/analytics',
    '/api/v1/reports',
    '/api/v2/reports',
    '/api/v1/summary',
    '/api/v2/summary',
    '/api/v1/metrics',
    '/api/v2/metrics',
    
    # Actividad/Status
    '/api/v1/activities',
    '/api/v2/activities',
    '/api/v1/events',
    '/api/v2/events',
    '/api/v1/checkins',
    '/api/v2/checkins',
    '/api/v1/access',
    '/api/v2/access',
    
    # Financiero
    '/api/v1/payments',
    '/api/v2/payments',
    '/api/v1/invoices',
    '/api/v2/invoices',
    '/api/v1/billing',
    '/api/v2/billing',
    '/api/v1/receivables',
    '/api/v2/receivables',
    
    # Fidelización
    '/api/v1/retention',
    '/api/v2/retention',
    '/api/v1/churn',
    '/api/v2/churn',
    '/api/v1/loyalty',
    '/api/v2/loyalty',
    
    # Campañas/Marketing
    '/api/v1/campaigns',
    '/api/v2/campaigns',
    '/api/v1/promotions',
    '/api/v2/promotions',
]

def test_endpoint(endpoint):
    """Prueba un endpoint y retorna el resultado"""
    try:
        url = f'{base_url}{endpoint}'
        response = requests.get(url, headers=headers, timeout=10)
        
        result = {
            'endpoint': endpoint,
            'status': response.status_code,
            'success': False,
            'data_type': None,
            'count': 0,
            'fields': []
        }
        
        if response.status_code == 200:
            result['success'] = True
            try:
                data = response.json()
                
                if isinstance(data, list):
                    result['data_type'] = 'list'
                    result['count'] = len(data)
                    if data:
                        result['fields'] = list(data[0].keys())
                elif isinstance(data, dict):
                    if 'list' in data:
                        result['data_type'] = 'dict_with_list'
                        items = data.get('list', [])
                        result['count'] = len(items)
                        if items:
                            result['fields'] = list(items[0].keys())
                    else:
                        result['data_type'] = 'dict'
                        result['fields'] = list(data.keys())[:20]
            except:
                result['data_type'] = 'unknown'
        
        return result
    except Exception as e:
        return {
            'endpoint': endpoint,
            'status': 'ERROR',
            'success': False,
            'error': str(e)[:50]
        }

# Ejecutar pruebas en paralelo para mayor velocidad
print('[SCAN] Probando {} endpoints en paralelo...\n'.format(len(endpoints_to_test)))

available_endpoints = []

with ThreadPoolExecutor(max_workers=10) as executor:
    future_to_endpoint = {executor.submit(test_endpoint, ep): ep for ep in endpoints_to_test}
    
    for future in as_completed(future_to_endpoint):
        result = future.result()
        
        if result['success']:
            available_endpoints.append(result)
            print(f"[OK] {result['endpoint']}")
            print(f"     Status: {result['status']}")
            print(f"     Tipo: {result['data_type']}")
            print(f"     Registros: {result['count']}")
            if result['fields']:
                print(f"     Campos: {', '.join(result['fields'][:10])}...")
            print()

print('\n' + '=' * 80)
print('[RESUMEN DE ENDPOINTS DISPONIBLES]')
print('=' * 80)

if available_endpoints:
    print(f'\nTotal endpoints funcionales: {len(available_endpoints)}\n')
    
    for ep in available_endpoints:
        print(f"Endpoint: {ep['endpoint']}")
        print(f"  Registros: {ep['count']}")
        print(f"  Estructura: {ep['data_type']}")
        if ep['fields']:
            print(f"  Campos clave: {', '.join(ep['fields'][:15])}")
        print()
else:
    print('\n[ADVERTENCIA] No se encontraron endpoints adicionales')
    print('\nLos únicos endpoints disponibles son:')
    print('  - /api/v1/prospects (prospectos/leads)')
    print('  - /api/v1/entries (accesos al gimnasio)')
    print('\n[RECOMENDACION]')
    print('La API W12App parece limitada a CRM básico (prospectos + accesos).')
    print('Para datos completos de clientes, planes y membresías necesitas:')
    print('  1. Acceso a la API nativa de EVO5 (no W12App)')
    print('  2. O exportación manual desde el panel administrativo')
    print('  3. O webhooks configurados para recibir eventos')

print('=' * 80)

# Guardar resultados
if available_endpoints:
    with open('available_endpoints.json', 'w', encoding='utf-8') as f:
        json.dump(available_endpoints, f, indent=2, ensure_ascii=False)
    print('\n[INFO] Resultados guardados en: available_endpoints.json')
