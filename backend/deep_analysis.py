import requests
import json
import re

base_url = 'https://sharkfitchile.w12app.com.br'
token = 'FB109206-CE01-4160-BCDF-8389B8725276'
headers = {'Authorization': f'Basic {token}'}

print('[INFO] Analisis profundo de datos disponibles')
print('=' * 80)

# 1. Analizar HTML de la raíz
print('\n[1] Analizando documentación HTML...\n')
try:
    response = requests.get(base_url, headers=headers, timeout=10)
    if response.status_code == 200:
        html = response.text
        
        # Buscar menciones de API endpoints en el HTML
        import re
        api_mentions = re.findall(r'/api/v[12]/\w+', html)
        if api_mentions:
            print('[ENDPOINTS MENCIONADOS EN HTML]:')
            unique_endpoints = list(set(api_mentions))
            for ep in unique_endpoints[:20]:
                print(f'  - {ep}')
        
        # Buscar links a documentación
        doc_links = re.findall(r'href="([^"]*(?:doc|api|swagger)[^"]*)"', html, re.IGNORECASE)
        if doc_links:
            print('\n[LINKS DE DOCUMENTACIÓN]:')
            for link in doc_links[:10]:
                print(f'  - {link}')
        
        # Guardar HTML para inspección
        with open('api_root.html', 'w', encoding='utf-8') as f:
            f.write(html)
        print('\n[INFO] HTML guardado en: api_root.html')
except Exception as e:
    print(f'[ERROR] {e}')

# 2. Analizar estructura completa de PROSPECTS
print('\n\n[2] Analizando estructura completa de PROSPECTS...\n')
try:
    response = requests.get(f'{base_url}/api/v1/prospects', headers=headers, timeout=15)
    if response.status_code == 200:
        data = response.json()
        prospects = data if isinstance(data, list) else data.get('list', [])
        
        print(f'Total prospects: {len(prospects)}')
        
        if prospects:
            # Analizar todos los campos disponibles
            all_fields = {}
            for prospect in prospects:
                for key, value in prospect.items():
                    if key not in all_fields:
                        all_fields[key] = {
                            'type': type(value).__name__,
                            'sample': str(value)[:100] if value else None,
                            'null_count': 0,
                            'filled_count': 0
                        }
                    
                    if value is None or value == '':
                        all_fields[key]['null_count'] += 1
                    else:
                        all_fields[key]['filled_count'] += 1
            
            print(f'\n[CAMPOS DISPONIBLES] ({len(all_fields)} campos):')
            print('-' * 80)
            for field, info in sorted(all_fields.items()):
                fill_rate = (info['filled_count'] / len(prospects)) * 100
                print(f"{field:30} | {info['type']:10} | {fill_rate:5.1f}% lleno | Ej: {info['sample']}")
            
            # Guardar ejemplo completo
            with open('prospect_example.json', 'w', encoding='utf-8') as f:
                json.dump(prospects[0], f, indent=2, ensure_ascii=False)
            print('\n[INFO] Ejemplo guardado en: prospect_example.json')
except Exception as e:
    print(f'[ERROR] {e}')

# 3. Analizar estructura completa de ENTRIES
print('\n\n[3] Analizando estructura completa de ENTRIES...\n')
try:
    response = requests.get(f'{base_url}/api/v1/entries', headers=headers, timeout=15)
    if response.status_code == 200:
        data = response.json()
        entries = data if isinstance(data, list) else data.get('list', [])
        
        print(f'Total entries: {len(entries)}')
        
        if entries:
            # Analizar todos los campos
            all_fields = {}
            for entry in entries:
                for key, value in entry.items():
                    if key not in all_fields:
                        all_fields[key] = {
                            'type': type(value).__name__,
                            'sample': str(value)[:100] if value else None,
                            'null_count': 0,
                            'filled_count': 0
                        }
                    
                    if value is None or value == '':
                        all_fields[key]['null_count'] += 1
                    else:
                        all_fields[key]['filled_count'] += 1
            
            print(f'\n[CAMPOS DISPONIBLES] ({len(all_fields)} campos):')
            print('-' * 80)
            for field, info in sorted(all_fields.items()):
                fill_rate = (info['filled_count'] / len(entries)) * 100
                print(f"{field:30} | {info['type']:10} | {fill_rate:5.1f}% lleno | Ej: {info['sample']}")
            
            # Extraer miembros únicos de entries
            unique_members = {}
            for entry in entries:
                member_id = entry.get('idMember')
                member_name = entry.get('nameMember')
                if member_id and member_id not in unique_members:
                    unique_members[member_id] = {
                        'name': member_name,
                        'access_count': 0,
                        'last_access': None
                    }
                if member_id:
                    unique_members[member_id]['access_count'] += 1
                    access_date = entry.get('dateTimeLiberationOrigin')
                    if access_date:
                        if not unique_members[member_id]['last_access'] or access_date > unique_members[member_id]['last_access']:
                            unique_members[member_id]['last_access'] = access_date
            
            print(f'\n[MIEMBROS ÚNICOS DETECTADOS]: {len(unique_members)}')
            print('\nEjemplos:')
            for member_id, info in list(unique_members.items())[:10]:
                print(f'  ID {member_id}: {info["name"]} - {info["access_count"]} accesos')
            
            # Guardar lista de miembros
            with open('members_from_entries.json', 'w', encoding='utf-8') as f:
                json.dump(unique_members, f, indent=2, ensure_ascii=False)
            print('\n[INFO] Lista de miembros guardada en: members_from_entries.json')
            
            # Guardar ejemplo completo
            with open('entry_example.json', 'w', encoding='utf-8') as f:
                json.dump(entries[0], f, indent=2, ensure_ascii=False)
            print('[INFO] Ejemplo guardado en: entry_example.json')
except Exception as e:
    print(f'[ERROR] {e}')

print('\n' + '=' * 80)
print('[RESUMEN]')
print('=' * 80)
print('\nDatos disponibles en W12App:')
print('1. PROSPECTS: Información de prospectos/leads (preventa)')
print('2. ENTRIES: Logs de acceso al gimnasio con nombres de miembros')
print('\nDatos que podemos inferir:')
print('- Lista de miembros activos (de entries)')
print('- Frecuencia de visitas por miembro')
print('- Último acceso de cada miembro')
print('\nDatos NO disponibles:')
print('- Planes/membresías activas')
print('- Información completa de clientes')
print('- Estado de pagos')
print('- Ventas detalladas')
print('- Información de contratos')
print('\n[RECOMENDACIÓN FINAL]')
print('Para dashboard completo necesitas una de estas opciones:')
print('1. Acceso a API EVO5 nativa (no W12App)')
print('2. Exportación CSV/Excel desde panel EVO5')
print('3. Configurar webhooks de EVO5 para recibir eventos')
print('4. Integración directa con base de datos EVO5 (si es accesible)')
print('=' * 80)
