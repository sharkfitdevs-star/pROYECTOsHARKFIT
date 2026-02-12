"""
Inspeccionar datos de /api/v1/members
"""

import requests
from requests.auth import HTTPBasicAuth
import json

DNS = 'sharkfitchile'
TOKEN = '654E1165-F181-402E-9DA8-A307FEAF727F'
BASE_URL = 'https://evo-integracao.w12app.com.br'

session = requests.Session()
session.auth = HTTPBasicAuth(DNS, TOKEN)

response = session.get(f'{BASE_URL}/api/v1/members')
members = response.json()

print('=' * 80)
print(f'MEMBERS API - Total: {len(members)} registros')
print('=' * 80)
print()

if members:
    # Mostrar primer miembro completo
    print('PRIMER MEMBER (estructura completa):')
    print(json.dumps(members[0], indent=2, ensure_ascii=False))
    print()
    print('=' * 80)
    
    # Mostrar todos los campos disponibles
    print('CAMPOS DISPONIBLES:')
    for key in sorted(members[0].keys()):
        value = members[0][key]
        value_str = str(value)[:50] if value else 'NULL'
        print(f'  {key:30} | {value_str}')
    print()
    print('=' * 80)
    
    # Buscar EDIXON CULTRERA
    print('BUSCANDO: EDIXON CULTRERA')
    print('=' * 80)
    for member in members:
        name = member.get('name', '') or ''
        if 'EDIXON' in name.upper() or 'CULTRERA' in name.upper():
            print(f'ENCONTRADO:')
            print(json.dumps(member, indent=2, ensure_ascii=False))
            break
    else:
        print('❌ No encontrado en members')
        print()
        print('Primeros 10 nombres:')
        for i, m in enumerate(members[:10], 1):
            print(f'{i}. {m.get("name", "N/A")}')
