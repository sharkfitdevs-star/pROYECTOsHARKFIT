"""
Script para verificar si existe un endpoint de sucursales/branches en la API de EVO
y consultar las sucursales ya registradas en la BD local.
"""

import requests
import json
import sqlite3
from datetime import datetime

# Configuración API EVO
BASE_URL = 'https://sharkfitchile.w12app.com.br'
TOKEN = 'FB109206-CE01-4160-BCDF-8389B8725276'
HEADERS = {'Authorization': f'Basic {TOKEN}'}

print("╔" + "═" * 78 + "╗")
print("║" + " " * 15 + "🏢 VERIFICACIÓN DE SUCURSALES EVO API" + " " * 25 + "║")
print("╚" + "═" * 78 + "╝\n")

# ============================================================================
# PARTE 1: CONSULTAR SUCURSALES EN LA BASE DE DATOS LOCAL
# ============================================================================
print("\n📊 PARTE 1: SUCURSALES EN BASE DE DATOS LOCAL")
print("=" * 80)

db_path = 'db.sqlite3'
try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Consultar sucursales únicas
    cursor.execute("""
        SELECT 
            branch_id,
            branch_name,
            COUNT(*) as total_members,
            SUM(CASE WHEN membership_status = 'active' THEN 1 ELSE 0 END) as active_members,
            SUM(CASE WHEN membership_status IN ('expired', 'inactive') THEN 1 ELSE 0 END) as inactive_members
        FROM members
        WHERE branch_name IS NOT NULL
        GROUP BY branch_id, branch_name
        ORDER BY total_members DESC
    """)
    
    branches_db = cursor.fetchall()
    
    if branches_db:
        print(f"\n✅ Total de sucursales encontradas: {len(branches_db)}\n")
        
        for branch in branches_db:
            branch_id, branch_name, total, active, inactive = branch
            print(f"📍 {branch_name}")
            print(f"   ID: {branch_id}")
            print(f"   Total miembros: {total}")
            print(f"   ├─ Activos: {active}")
            print(f"   └─ Inactivos: {inactive}")
            print()
    else:
        print("\n⚠️  No se encontraron sucursales en los datos")
    
    # Verificar miembros sin sucursal
    cursor.execute("SELECT COUNT(*) FROM members WHERE branch_name IS NULL")
    sin_sucursal = cursor.fetchone()[0]
    
    if sin_sucursal > 0:
        print(f"⚠️  Miembros sin sucursal asignada: {sin_sucursal}\n")
    
    conn.close()
    
except Exception as e:
    print(f"❌ Error al consultar BD: {e}\n")

# ============================================================================
# PARTE 2: BUSCAR ENDPOINTS DE SUCURSALES EN LA API EVO
# ============================================================================
print("\n🔍 PARTE 2: BÚSQUEDA DE ENDPOINTS DE SUCURSALES EN API EVO")
print("=" * 80)

# Endpoints posibles para sucursales/branches/locations
branch_endpoints = [
    # Sucursales/Branches
    '/api/v1/branches',
    '/api/v2/branches',
    '/api/v1/branch',
    '/api/v2/branch',
    
    # Locations
    '/api/v1/locations',
    '/api/v2/locations',
    '/api/v1/location',
    '/api/v2/location',
    
    # Stores
    '/api/v1/stores',
    '/api/v2/stores',
    
    # Units
    '/api/v1/units',
    '/api/v2/units',
    '/api/v1/unit',
    '/api/v2/unit',
    
    # Companies/Organizations
    '/api/v1/companies',
    '/api/v2/companies',
    '/api/v1/company',
    '/api/v2/company',
    '/api/v1/organization',
    '/api/v2/organization',
    '/api/v1/organizations',
    '/api/v2/organizations',
    
    # Facilities
    '/api/v1/facilities',
    '/api/v2/facilities',
    '/api/v1/facility',
    '/api/v2/facility',
    
    # Sites
    '/api/v1/sites',
    '/api/v2/sites',
    '/api/v1/site',
    '/api/v2/site',
    
    # Gyms
    '/api/v1/gyms',
    '/api/v2/gyms',
    '/api/v1/gym',
    '/api/v2/gym',
]

print(f"\n🔎 Probando {len(branch_endpoints)} endpoints potenciales...\n")

found_endpoints = []

for endpoint in branch_endpoints:
    try:
        url = f'{BASE_URL}{endpoint}'
        response = requests.get(url, headers=HEADERS, timeout=10)
        
        if response.status_code == 200:
            print(f"✅ [{response.status_code}] {endpoint}")
            
            try:
                data = response.json()
                
                # Analizar estructura
                if isinstance(data, list):
                    count = len(data)
                    fields = list(data[0].keys()) if data else []
                    print(f"    📦 Tipo: Lista con {count} registros")
                    if fields:
                        print(f"    🔑 Campos: {', '.join(fields[:10])}")
                        
                        # Mostrar primeros registros
                        if data:
                            print(f"    📋 Ejemplo de datos:")
                            for item in data[:3]:
                                print(f"       - {json.dumps(item, ensure_ascii=False)[:200]}")
                    
                elif isinstance(data, dict):
                    if 'list' in data:
                        items = data.get('list', [])
                        count = len(items)
                        fields = list(items[0].keys()) if items else []
                        print(f"    📦 Tipo: Dict con lista de {count} registros")
                        if fields:
                            print(f"    🔑 Campos: {', '.join(fields[:10])}")
                            if items:
                                print(f"    📋 Ejemplo de datos:")
                                for item in items[:3]:
                                    print(f"       - {json.dumps(item, ensure_ascii=False)[:200]}")
                    else:
                        print(f"    📦 Tipo: Objeto/Dict")
                        print(f"    🔑 Campos: {', '.join(list(data.keys())[:10])}")
                        print(f"    📋 Datos: {json.dumps(data, ensure_ascii=False)[:300]}")
                
                found_endpoints.append({
                    'endpoint': endpoint,
                    'status': response.status_code,
                    'data': data
                })
                print()
                
            except json.JSONDecodeError:
                print(f"    ⚠️  Respuesta no es JSON: {response.text[:100]}")
                print()
                
        elif response.status_code == 401:
            print(f"🔐 [{response.status_code}] {endpoint} - No autorizado")
        elif response.status_code == 403:
            print(f"⛔ [{response.status_code}] {endpoint} - Prohibido")
        elif response.status_code == 404:
            # No mostrar 404s para no saturar
            pass
        else:
            print(f"❓ [{response.status_code}] {endpoint}")
            
    except requests.exceptions.Timeout:
        print(f"⏱️  {endpoint} - Timeout")
    except requests.exceptions.RequestException as e:
        pass

# ============================================================================
# PARTE 3: ANALIZAR DATOS DE PROSPECTS Y ENTRIES PARA VER BRANCH_ID
# ============================================================================
print("\n\n📋 PARTE 3: ANÁLISIS DE BRANCH_ID EN DATOS EXISTENTES")
print("=" * 80)

# Verificar si prospects tiene información de sucursales
print("\n🔍 Analizando /api/v1/prospects...\n")
try:
    response = requests.get(f'{BASE_URL}/api/v1/prospects', headers=HEADERS, params={'limit': 100}, timeout=15)
    if response.status_code == 200:
        prospects = response.json()
        if prospects:
            # Buscar campos relacionados con branch
            sample = prospects[0]
            branch_fields = [k for k in sample.keys() if 'branch' in k.lower() or 'location' in k.lower() or 'site' in k.lower()]
            
            if branch_fields:
                print(f"✅ Campos de sucursal encontrados: {', '.join(branch_fields)}")
                
                # Contar sucursales únicas
                branch_ids = set()
                branch_names = set()
                for p in prospects:
                    if 'idBranch' in p and p.get('idBranch'):
                        branch_ids.add(str(p.get('idBranch')))
                    if 'branchName' in p and p.get('branchName'):
                        branch_names.add(p.get('branchName'))
                
                if branch_ids:
                    print(f"\n📍 Sucursales únicas en prospects:")
                    print(f"   IDs encontrados: {', '.join(sorted(branch_ids))}")
                if branch_names:
                    print(f"   Nombres: {', '.join(sorted(branch_names))}")
                
                # Mostrar ejemplos
                print(f"\n📋 Ejemplos de datos:")
                for p in prospects[:3]:
                    branch_info = {k: p.get(k) for k in branch_fields if k in p}
                    print(f"   Prospect {p.get('nameProspect', 'N/A')}: {branch_info}")
            else:
                print("⚠️  No se encontraron campos de sucursal en prospects")
                print(f"   Campos disponibles: {', '.join(list(sample.keys())[:15])}")
    else:
        print(f"❌ Error al obtener prospects: {response.status_code}")
except Exception as e:
    print(f"❌ Error: {e}")

# Verificar entries
print("\n\n🔍 Analizando /api/v1/entries...\n")
try:
    response = requests.get(f'{BASE_URL}/api/v1/entries', headers=HEADERS, params={'limit': 100}, timeout=15)
    if response.status_code == 200:
        entries = response.json()
        if entries:
            sample = entries[0]
            branch_fields = [k for k in sample.keys() if 'branch' in k.lower() or 'location' in k.lower()]
            
            if branch_fields:
                print(f"✅ Campos de sucursal encontrados: {', '.join(branch_fields)}")
                
                # Contar sucursales únicas
                branch_ids = set()
                branch_names = set()
                for e in entries:
                    if 'idBranch' in e and e.get('idBranch'):
                        branch_ids.add(str(e.get('idBranch')))
                    if 'branchName' in e and e.get('branchName'):
                        branch_names.add(e.get('branchName'))
                
                if branch_ids:
                    print(f"\n📍 Sucursales únicas en entries:")
                    print(f"   IDs encontrados: {', '.join(sorted(branch_ids))}")
                if branch_names:
                    print(f"   Nombres: {', '.join(sorted(branch_names))}")
                
                # Mostrar ejemplos
                print(f"\n📋 Ejemplos de datos:")
                for e in entries[:3]:
                    branch_info = {k: e.get(k) for k in branch_fields if k in e}
                    print(f"   Entry {e.get('nameMember', 'N/A')}: {branch_info}")
            else:
                print("⚠️  No se encontraron campos de sucursal en entries")
                print(f"   Campos disponibles: {', '.join(list(sample.keys())[:15])}")
    else:
        print(f"❌ Error al obtener entries: {response.status_code}")
except Exception as e:
    print(f"❌ Error: {e}")

# ============================================================================
# RESUMEN FINAL
# ============================================================================
print("\n\n" + "=" * 80)
print("📊 RESUMEN Y CONCLUSIONES")
print("=" * 80)

if found_endpoints:
    print(f"\n✅ Se encontraron {len(found_endpoints)} endpoint(s) de sucursales:")
    for ep in found_endpoints:
        print(f"   • {ep['endpoint']} - Status: {ep['status']}")
    
    # Guardar resultados
    with open('branch_endpoints_found.json', 'w', encoding='utf-8') as f:
        json.dump(found_endpoints, f, indent=2, ensure_ascii=False)
    print(f"\n💾 Datos guardados en: branch_endpoints_found.json")
else:
    print("\n❌ NO se encontró un endpoint específico para listar sucursales.")
    print("\n📌 EXPLICACIÓN:")
    print("   La API W12App de EVO no expone un endpoint dedicado para sucursales.")
    print("   Sin embargo, la información de sucursales (idBranch, branchName) está")
    print("   incluida en los registros de:")
    print("   • /api/v1/prospects (campo idBranch y branchName)")
    print("   • /api/v1/entries (campo idBranch y branchName)")
    print("\n💡 SOLUCIÓN ACTUAL:")
    print("   Para obtener la lista de sucursales, debes:")
    print("   1. Consultar los datos ya sincronizados en tu BD local")
    print("   2. Extraer los branch_id y branch_name únicos")
    print("   3. O hacer una consulta a prospects/entries y extraer las sucursales")

print("\n" + "=" * 80)
print(f"⏰ Verificación completada: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print("=" * 80)
