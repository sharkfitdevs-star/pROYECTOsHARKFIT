"""
Script mejorado para verificar endpoints de sucursales en AMBAS APIs de EVO:
- API de Integración EVO (evo-integracao.w12app.com.br) - API COMPLETA
- API W12App (sharkfitchile.w12app.com.br) - API LIMITADA
"""

import requests
import json
from datetime import datetime

print("╔" + "═" * 78 + "╗")
print("║" + " " * 10 + "🏢 VERIFICACIÓN DE SUCURSALES - AMBAS APIs EVO" + " " * 18 + "║")
print("╚" + "═" * 78 + "╝\n")

# ============================================================================
# CONFIGURACIÓN
# ============================================================================
DNS = 'sharkfitchile'
INTEGRATION_TOKEN = 'FB109206-CE01-4160-BCDF-8389B8725276'
W12_TOKEN = 'FB109206-CE01-4160-BCDF-8389B8725276'  # Mismo token para ambas

# URLs
INTEGRATION_API = 'https://evo-integracao.w12app.com.br'
W12APP_API = f'https://{DNS}.w12app.com.br'

# ============================================================================
# PARTE 1: API DE INTEGRACIÓN EVO (Completa)
# ============================================================================
print("\n🔧 PARTE 1: API DE INTEGRACIÓN EVO (evo-integracao.w12app.com.br)")
print("=" * 80)
print("Esta es la API COMPLETA con todos los endpoints de EVO\n")

session_integration = requests.Session()
session_integration.auth = (DNS, INTEGRATION_TOKEN)
session_integration.headers.update({
    'Content-Type': 'application/json',
    'Accept': 'application/json'
})

# Endpoints para buscar en Integration API
integration_endpoints = [
    # Branches/Sucursales
    '/api/v1/branches',
    '/api/v2/branches',
    '/branches',
    '/branch',
    
    # Unidades/Units
    '/api/v1/units',
    '/api/v2/units',
    '/units',
    '/unit',
    
    # Companies/Empresas
    '/api/v1/companies',
    '/api/v2/companies',
    '/companies',
    '/company',
    
    # Locations
    '/api/v1/locations',
    '/api/v2/locations',
    '/locations',
    '/location',
    
    # Organizations
    '/api/v1/organizations',  
    '/api/v2/organizations',
    '/organizations',
    '/organization',
    
    # Facilities
    '/facilities',
    '/facility',
    
    # Gym info
    '/gym',
    '/gyms',
    
    # Tenant/Account info
    '/account',
    '/tenant',
    '/config',
    '/info',
    '/me',
]

found_integration = []

print("🔎 Probando endpoints de sucursales en Integration API...\n")

for endpoint in integration_endpoints:
    try:
        url = f'{INTEGRATION_API}{endpoint}'
        response = session_integration.get(url, timeout=10)
        
        status_icon = "✅" if response.status_code == 200 else "❌"
        
        if response.status_code in [200, 401, 403]:  # Mostrar si existe (aunque esté bloqueado)
            print(f"{status_icon} [{response.status_code}] {endpoint}")
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    
                    # Analizar estructura
                    if isinstance(data, list):
                        count = len(data)
                        print(f"    📦 Lista con {count} registros")
                        if data:
                            print(f"    🔑 Campos: {', '.join(list(data[0].keys())[:10])}")
                            print(f"    📋 Ejemplo: {json.dumps(data[0], ensure_ascii=False)[:150]}...")
                    elif isinstance(data, dict):
                        if 'data' in data or 'list' in data or 'items' in data:
                            items_key = 'data' if 'data' in data else ('list' if 'list' in data else 'items')
                            items = data.get(items_key, [])
                            print(f"    📦 Dict con {len(items)} items (key: {items_key})")
                            if items and isinstance(items, list) and items:
                                print(f"    🔑 Campos: {', '.join(list(items[0].keys())[:10])}")
                        else:
                            print(f"    📦 Objeto/Dict")
                            print(f"    🔑 Keys: {', '.join(list(data.keys())[:10])}")
                            print(f"    📋 Data: {json.dumps(data, ensure_ascii=False)[:200]}...")
                    
                    found_integration.append({
                        'endpoint': endpoint,
                        'status': response.status_code,
                        'data': data
                    })
                    print()
                    
                except json.JSONDecodeError:
                    print(f"    ⚠️  No es JSON válido")
                    print()
                    
            elif response.status_code == 401:
                print(f"    🔐 Requiere autenticación (podría existir)")
                print()
            elif response.status_code == 403:
                print(f"    ⛔ Acceso denegado (existe pero sin permisos)")
                print()
                
    except requests.exceptions.Timeout:
        print(f"⏱️  {endpoint} - Timeout")
    except requests.exceptions.RequestException as e:
        pass

# ============================================================================
# PARTE 2: API W12APP (Limitada)
# ============================================================================
print("\n\n🌐 PARTE 2: API W12APP ({dns}.w12app.com.br)")
print("=" * 80)
print("Esta es la API LIMITADA de W12App (solo algunos endpoints)\n")

w12_headers = {'Authorization': f'Basic {W12_TOKEN}'}

w12_endpoints = [
    '/api/v1/branches',
    '/api/v2/branches',
    '/api/v1/companies',
    '/api/v2/companies',
    '/api/v1/locations',
    '/api/v2/locations',
    '/api/v1/units',
    '/api/v2/units',
]

found_w12 = []

print("🔎 Probando endpoints de sucursales en W12App API...\n")

for endpoint in w12_endpoints:
    try:
        url = f'{W12APP_API}{endpoint}'
        response = requests.get(url, headers=w12_headers, timeout=10)
        
        status_icon = "✅" if response.status_code == 200 else "❌"
        
        if response.status_code in [200, 401, 403]:
            print(f"{status_icon} [{response.status_code}] {endpoint}")
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    
                    if isinstance(data, list):
                        print(f"    📦 Lista con {len(data)} registros")
                        if data:
                            print(f"    🔑 Campos: {', '.join(list(data[0].keys())[:10])}")
                            print(f"    📋 Ejemplo: {json.dumps(data[0], ensure_ascii=False)[:150]}...")
                    elif isinstance(data, dict):
                        print(f"    📦 Dict")
                        print(f"    🔑 Keys: {', '.join(list(data.keys())[:10])}")
                    
                    found_w12.append({
                        'endpoint': endpoint,
                        'status': response.status_code,
                        'data': data
                    })
                    print()
                    
                except json.JSONDecodeError:
                    print(f"    ⚠️  No es JSON válido")
                    print()
                    
    except requests.exceptions.RequestException:
        pass

# ============================================================================
# PARTE 3: VERIFICAR DATOS ACTUALES (Members API)
# ============================================================================
print("\n\n📊 PARTE 3: ANÁLISIS DE CAMPOS DE SUCURSAL EN DATOS EXISTENTES")
print("=" * 80)

# Probar el endpoint de members de Integration API
print("\n🔍 Verificando /members en Integration API...\n")

members_endpoints = [
    '/members',
    '/api/v1/members',
    '/api/v2/members',
    '/subscribers',
    '/api/v1/subscribers',
]

for endpoint in members_endpoints:
    try:
        url = f'{INTEGRATION_API}{endpoint}'
        response = session_integration.get(url, timeout=15, params={'take': 10})
        
        if response.status_code == 200:
            print(f"✅ [{response.status_code}] {endpoint} - ¡FUNCIONA!")
            
            try:
                data = response.json()
                
                # Buscar estructura de datos
                members_list = None
                if isinstance(data, list):
                    members_list = data
                elif isinstance(data, dict):
                    # Buscar la key que contiene la lista
                    for key in ['data', 'list', 'items', 'members', 'subscribers']:
                        if key in data and isinstance(data[key], list):
                            members_list = data[key]
                            break
                
                if members_list and members_list:
                    print(f"    📦 Total registros: {len(members_list)}")
                    
                    sample = members_list[0]
                    all_keys = list(sample.keys())
                    
                    # Buscar campos relacionados con sucursales
                    branch_keys = [k for k in all_keys if any(term in k.lower() for term in ['branch', 'location', 'unit', 'facility', 'site', 'gym', 'company'])]
                    
                    print(f"    🔑 Total campos: {len(all_keys)}")
                    print(f"    📍 Campos de sucursal: {branch_keys if branch_keys else 'No encontrados'}")
                    
                    if branch_keys:
                        print(f"\n    📋 Ejemplos de valores de sucursal:")
                        for member in members_list[:5]:
                            branch_info = {k: member.get(k) for k in branch_keys}
                            member_name = member.get('name', member.get('nome', member.get('memberName', 'N/A')))
                            print(f"       • {member_name}: {branch_info}")
                    
                    # Mostrar todos los campos del primer registro
                    print(f"\n    📝 Todos los campos disponibles (sample):")
                    print(f"       {', '.join(all_keys)}")
                    
                    print()
                    break  # Encontramos el endpoint correcto
                else:
                    print(f"    ⚠️  Respuesta vacía o estructura desconocida")
                    print()
                    
            except json.JSONDecodeError:
                print(f"    ❌ No es JSON válido")
                print()
                
    except requests.exceptions.RequestException as e:
        pass

# ============================================================================
# RESUMEN FINAL
# ============================================================================
print("\n" + "=" * 80)
print("📊 RESUMEN Y CONCLUSIONES")
print("=" * 80)

total_found = len(found_integration) + len(found_w12)

if total_found > 0:
    print(f"\n✅ Se encontraron {total_found} endpoint(s) relacionados con sucursales:\n")
    
    if found_integration:
        print("   🔧 Integration API:")
        for ep in found_integration:
            print(f"      • {ep['endpoint']}")
    
    if found_w12:
        print("\n   🌐 W12App API:")
        for ep in found_w12:
            print(f"      • {ep['endpoint']}")
    
    # Guardar resultados
    all_results = {
        'integration_api': found_integration,
        'w12app_api': found_w12,
        'timestamp': datetime.now().isoformat()
    }
    
    with open('branch_endpoints_results.json', 'w', encoding='utf-8') as f:
        json.dump(all_results, f, indent=2, ensure_ascii=False)
    
    print(f"\n💾 Resultados guardados en: branch_endpoints_results.json")
    
else:
    print("\n❌ NO se encontró un endpoint específico para listar sucursales.")
    print("\n📌 HALLAZGOS:")
    print("   • La API de EVO no expone un endpoint dedicado para sucursales")
    print("   • La información de sucursales está embebida en los registros de members")
    print("   • Los campos típicos son: idBranch, branchName, idUnit, unitName")
    print("\n💡 SOLUCIÓN:")
    print("   Para obtener la lista de sucursales activas de Sharkfit:")
    print("   1. Consultar el endpoint /members de Integration API")
    print("   2. Extraer los valores únicos de idBranch y branchName")
    print("   3. Construir tu propio catálogo de sucursales")
    print("\n📊 DATOS ACTUALES:")
    print("   Según tu BD actual, Sharkfit tiene:")
    print("   • 1 sucursal identificada: 'SHARK FIT - NOGALES' (ID: 1)")
    print("   • 50 miembros en esta sucursal")
    print("   • 98 miembros sin sucursal asignada (posible data cleaning necesario)")

print("\n" + "=" * 80)
print(f"⏰ Verificación completada: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print("=" * 80)
