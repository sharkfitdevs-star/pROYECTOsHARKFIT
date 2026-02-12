"""
Script para extraer TODAS las sucursales únicas de Sharkfit desde la API de EVO
y compararlas con las que ya están en la BD.
"""

import requests
import json
import sqlite3
from collections import defaultdict
from datetime import datetime

print("╔" + "═" * 78 + "╗")
print("║" + " " * 15 + "🏢 CATÁLOGO DE SUCURSALES SHARKFIT" + " " * 23 + "║")
print("╚" + "═" * 78 + "╝\n")

# Configuración
DNS = 'sharkfitchile'
TOKEN = 'FB109206-CE01-4160-BCDF-8389B8725276'
API_URL = 'https://evo-integracao.w12app.com.br'

# Configurar sesión
session = requests.Session()
session.auth = (DNS, TOKEN)
session.headers.update({
    'Content-Type': 'application/json',
    'Accept': 'application/json'
})

print("🔧 Conectando a la API de Integración EVO...\n")

# ============================================================================
# PARTE 1: EXTRAER TODAS LAS SUCURSALES DESDE LA API
# ============================================================================
print("📡 PARTE 1: EXTRAYENDO SUCURSALES DESDE LA API")
print("=" * 80)

branches_from_api = {}  # {branch_id: {name, member_count, active_count, inactive_count}}

try:
    # Obtener todos los members (paginado si es necesario)
    skip = 0
    take = 100
    total_members_processed = 0
    
    print("⏳ Descargando datos de members...\n")
    
    while True:
        print(f"   Solicitando registros {skip} - {skip + take}...", end='')
        
        response = session.get(
            f'{API_URL}/api/v1/members',
            params={'skip': skip, 'take': take},
            timeout=30
        )
        
        if response.status_code != 200:
            print(f" ❌ Error {response.status_code}")
            break
        
        members = response.json()
        
        if not members or len(members) == 0:
            print(f" ✅ Fin de datos")
            break
        
        print(f" ✅ {len(members)} registros")
        
        for member in members:
            branch_id = member.get('idBranch')
            branch_name = member.get('branchName')
            membership_status = member.get('membershipStatus', '').lower()
            
            if branch_id and branch_name:
                if branch_id not in branches_from_api:
                    branches_from_api[branch_id] = {
                        'name': branch_name,
                        'member_count': 0,
                        'active_count': 0,
                        'inactive_count': 0,
                        'members': []
                    }
                
                branches_from_api[branch_id]['member_count'] += 1
                
                if membership_status == 'active':
                    branches_from_api[branch_id]['active_count'] += 1
                else:
                    branches_from_api[branch_id]['inactive_count'] += 1
                
                # Guardar info del member
                branches_from_api[branch_id]['members'].append({
                    'id': member.get('idMember'),
                    'name': f"{member.get('firstName', '')} {member.get('lastName', '')}".strip(),
                    'status': membership_status,
                    'registerDate': member.get('registerDate')
                })
            
            total_members_processed += 1
        
        # Siguiente página
        skip += take
        
        # Límite de seguridad (max 5000 members)
        if skip >= 5000:
            print("   ⚠️  Límite de 5000 registros alcanzado")
            break
    
    print(f"\n✅ Total members procesados: {total_members_processed}")
    print(f"✅ Sucursales únicas encontradas: {len(branches_from_api)}\n")
    
except Exception as e:
    print(f"❌ Error al obtener datos de la API: {e}\n")

# Mostrar sucursales encontradas en la API
if branches_from_api:
    print("\n📊 SUCURSALES ENCONTRADAS EN LA API EVO:")
    print("=" * 80)
    
    for branch_id, info in sorted(branches_from_api.items()):
        print(f"\n📍 {info['name']}")
        print(f"   ID: {branch_id}")
        print(f"   Total miembros: {info['member_count']}")
        print(f"   ├─ Activos: {info['active_count']}")
        print(f"   └─ Inactivos: {info['inactive_count']}")
        
        # Mostrar algunos miembros de ejemplo
        if info['members']:
            print(f"   👥 Miembros ejemplo:")
            for member in info['members'][:5]:
                status_icon = "🟢" if member['status'] == 'active' else "🔴"
                print(f"      {status_icon} {member['name']} (ID: {member['id']})")

else:
    print("\n⚠️  No se encontraron sucursales en los datos de la API")

# ============================================================================
# PARTE 2: COMPARAR CON LOS DATOS DE LA BD LOCAL
# ============================================================================
print("\n\n📊 PARTE 2: COMPARACIÓN CON BASE DE DATOS LOCAL")
print("=" * 80)

branches_from_db = {}

try:
    conn = sqlite3.connect('db.sqlite3')
    cursor = conn.cursor()
    
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
    """)
    
    branches_db_list = cursor.fetchall()
    
    for row in branches_db_list:
        branch_id, branch_name, total, active, inactive = row
        branches_from_db[int(branch_id)] = {
            'name': branch_name,
            'total': total,
            'active': active,
            'inactive': inactive
        }
    
    conn.close()
    
    if branches_from_db:
        print(f"\n✅ Sucursales en BD local: {len(branches_from_db)}\n")
        
        for branch_id, info in branches_from_db.items():
            print(f"📍 {info['name']} (ID: {branch_id})")
            print(f"   Total: {info['total']} | Activos: {info['active']} | Inactivos: {info['inactive']}")
    else:
        print("\n⚠️  No hay sucursales en la BD local")
        
except Exception as e:
    print(f"❌ Error al consultar BD: {e}")

# ============================================================================
# PARTE 3: ANÁLISIS COMPARATIVO
# ============================================================================
print("\n\n🔍 PARTE 3: ANÁLISIS COMPARATIVO")
print("=" * 80)

# Sucursales en API pero NO en BD
missing_in_db = set(branches_from_api.keys()) - set(branches_from_db.keys())

# Sucursales en BD pero NO en API (posibles obsoletas)
missing_in_api = set(branches_from_db.keys()) - set(branches_from_api.keys())

# Sucursales en ambas (verificar consistencia)
in_both = set(branches_from_api.keys()) & set(branches_from_db.keys())

if missing_in_db:
    print(f"\n⚠️  SUCURSALES EN API PERO NO EN BD LOCAL (requieren sincronización):")
    for branch_id in missing_in_db:
        info = branches_from_api[branch_id]
        print(f"   📍 {info['name']} (ID: {branch_id})")
        print(f"      {info['member_count']} miembros ({info['active_count']} activos)")
else:
    print("\n✅ Todas las sucursales de la API están en la BD local")

if missing_in_api:
    print(f"\n⚠️  SUCURSALES EN BD LOCAL PERO NO EN API (posibles obsoletas):")
    for branch_id in missing_in_api:
        info = branches_from_db[branch_id]
        print(f"   📍 {info['name']} (ID: {branch_id})")
else:
    print("\n✅ Todas las sucursales de la BD están en la API")

if in_both:
    print(f"\n✅ SUCURSALES EN AMBAS (API y BD):")
    
    has_differences = False
    
    for branch_id in in_both:
        api_info = branches_from_api[branch_id]
        db_info = branches_from_db[branch_id]
        
        # Verificar diferencias en nombres
        if api_info['name'] != db_info['name']:
            print(f"\n   ⚠️  Diferencia en nombre para ID {branch_id}:")
            print(f"      API: {api_info['name']}")
            print(f"      BD:  {db_info['name']}")
            has_differences = True
        
        # Verificar diferencias en counts (tolerancia de ±5)
        member_diff = abs(api_info['member_count'] - db_info['total'])
        if member_diff > 5:
            print(f"\n   ⚠️  Diferencia significativa en miembros ({api_info['name']}):")
            print(f"      API: {api_info['member_count']} miembros")
            print(f"      BD:  {db_info['total']} miembros")
            print(f"      Diferencia: {member_diff}")
            has_differences = True
    
    if not has_differences:
        print("\n   ✅ Los datos están sincronizados correctamente")

# ============================================================================
# RESUMEN FINAL
# ============================================================================
print("\n\n" + "=" * 80)
print("📊 RESUMEN FINAL")
print("=" * 80)

print(f"\n🏢 SUCURSALES DE SHARKFIT:")
print(f"   Total únicas en API: {len(branches_from_api)}")
print(f"   Total en BD local: {len(branches_from_db)}")

if len(branches_from_api) == 1 and 1 in branches_from_api:
    print(f"\n✅ CONFIRMADO: Sharkfit tiene UNA SOLA sucursal")
    branch_info = branches_from_api[1]
    print(f"\n   📍 {branch_info['name']}")
    print(f"      • ID: 1")
    print(f"      • Total miembros: {branch_info['member_count']}")
    print(f"      • Activos: {branch_info['active_count']}")
    print(f"      • Inactivos: {branch_info['inactive_count']}")
    
    print(f"\n💡 IMPLICACIONES:")
    print(f"   • No necesitas un filtro por sucursal en el dashboard")
    print(f"   • Todos los datos son de la misma ubicación")
    print(f"   • La arquitectura multi-tenant puede simplificarse")
    
elif len(branches_from_api) > 1:
    print(f"\n📍 MÚLTIPLES SUCURSALES DETECTADAS:")
    print(f"   Sharkfit opera con {len(branches_from_api)} sucursales")
    
    for branch_id, info in sorted(branches_from_api.items()):
        print(f"\n   • {info['name']} (ID: {branch_id})")
        print(f"     {info['active_count']} activos de {info['member_count']} total")
    
    print(f"\n💡 RECOMENDACIÓN:")
    print(f"   • Implementar filtro por sucursal en el dashboard")
    print(f"   • Configurar permisos por sucursal si es necesario")
    print(f"   • Considerar reportes separados por ubicación")
else:
    print(f"\n⚠️  No se encontraron sucursales definidas")

# Guardar reporte
report_data = {
    'timestamp': datetime.now().isoformat(),
    'branches_in_api': {
        str(k): {
            'name': v['name'],
            'member_count': v['member_count'],
            'active_count': v['active_count'],
            'inactive_count': v['inactive_count']
        }
        for k, v in branches_from_api.items()
    },
    'branches_in_db': {
        str(k): {
            'name': v['name'],
            'total': v['total'],
            'active': v['active'],
            'inactive': v['inactive']
        }
        for k, v in branches_from_db.items()
    },
    'analysis': {
        'total_in_api': len(branches_from_api),
        'total_in_db': len(branches_from_db),
        'missing_in_db': list(missing_in_db),
        'missing_in_api': list(missing_in_api),
        'in_both': list(in_both)
    }
}

with open('branches_report.json', 'w', encoding='utf-8') as f:
    json.dump(report_data, f, indent=2, ensure_ascii=False)

print(f"\n💾 Reporte completo guardado en: branches_report.json")

print("\n" + "=" * 80)
print(f"⏰ Análisis completado: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print("=" * 80)
