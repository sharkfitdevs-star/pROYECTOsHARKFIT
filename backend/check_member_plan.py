#!/usr/bin/env python
import requests
import json

# Configuración EVO W12
dns = 'sharkfitchile'
token = 'FB109206-CE01-4160-BCDF-8389B8725276'
member_id = 7827

base_url = f'https://{dns}.w12app.com.br'
headers = {'Authorization': f'Basic {token}'}

print('🔍 Consultando EVO W12 API para EDIXON CULTRERA (ID: 7827)\n')

# 1. Obtener info del miembro
try:
    response = requests.get(f'{base_url}/api/v1/members/{member_id}', headers=headers, timeout=10)
    if response.status_code == 200:
        member = response.json()
        print('═══ INFORMACIÓN DEL MIEMBRO ═══')
        first_name = member.get('firstName', '')
        last_name = member.get('lastName', '')
        print(f'Nombre: {first_name} {last_name}')
        print(f'Documento: {member.get("document", "N/A")}')
        print(f'Email: {member.get("email", "N/A")}')
        print(f'Estado: {member.get("status", "N/A")}')
        print(f'Branch: {member.get("idBranch", "N/A")} - {member.get("branchName", "")}')
        print()
    else:
        print(f'⚠️  Error al obtener miembro: {response.status_code}')
except Exception as e:
    print(f'❌ Error: {e}')

# 2. Obtener membresías activas
try:
    response = requests.get(f'{base_url}/api/v1/memberships', headers=headers, timeout=10, params={'idMember': member_id})
    if response.status_code == 200:
        memberships_data = response.json()
        memberships = memberships_data if isinstance(memberships_data, list) else memberships_data.get('list', [])
        
        print('═══ MEMBRESÍAS ACTIVAS ═══')
        if memberships:
            for m in memberships:
                print(f'\n  Plan: {m.get("membershipName", "Sin nombre")}')
                print(f'  ID Membership: {m.get("idMembership", "N/A")}')
                print(f'  Estado: {m.get("status", "N/A")}')
                print(f'  Fecha Inicio: {m.get("startDate", "N/A")}')
                print(f'  Fecha Fin: {m.get("endDate", "N/A")}')
                print(f'  Valor: {m.get("value", 0)}')
        else:
            print('  No hay membresías activas registradas')
    else:
        print(f'⚠️  Error al obtener membresías: {response.status_code}')
except Exception as e:
    print(f'❌ Error: {e}')

print()
