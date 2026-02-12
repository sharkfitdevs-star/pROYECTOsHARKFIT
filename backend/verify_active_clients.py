import sqlite3

conn = sqlite3.connect('db.sqlite3')
cursor = conn.cursor()

# Estadísticas generales
cursor.execute('''
    SELECT 
        COUNT(*) as total,
        COUNT(DISTINCT branch_name) as branches
    FROM members
    WHERE status = 'active'
''')

stats = cursor.fetchone()
print('\n[ESTADISTICAS DE CLIENTES ACTIVOS]')
print('-' * 60)
print(f'Total clientes activos: {stats[0]}')
print(f'Sucursales diferentes: {stats[1]}')

# Top 10 clientes
cursor.execute('''
    SELECT name, branch_name, last_access_date
    FROM members
    WHERE status = 'active'
    ORDER BY last_access_date DESC
    LIMIT 10
''')

print('\n[TOP 10 ULTIMOS ACCESOS]')
print('-' * 60)
for name, branch, last_access in cursor.fetchall():
    branch_display = branch if branch else 'N/A'
    print(f'{name:40} | Branch {branch_display} | {last_access}')

# Buscar a EDIXON CULTRERA
cursor.execute('''
    SELECT evo_member_id, name, status, membership_status, 
           branch_name, registration_date, last_access_date
    FROM members
    WHERE name LIKE '%EDIXON%'
''')

print('\n[EDIXON CULTRERA - INFORMACION COMPLETA]')
print('-' * 60)
edixon = cursor.fetchone()
if edixon:
    print(f'ID EVO: {edixon[0]}')
    print(f'Nombre: {edixon[1]}')
    print(f'Status: {edixon[2]}')
    print(f'Membresia: {edixon[3]}')
    print(f'Sucursal: {edixon[4]}')
    print(f'Primera visita: {edixon[5]}')
    print(f'Ultima visita: {edixon[6]}')
    
    # Contar visitas
    cursor.execute('''
        SELECT COUNT(*) FROM access_logs
        WHERE member_evo_id = ?
    ''', [edixon[0]])
    visits = cursor.fetchone()[0]
    print(f'Total visitas registradas: {visits}')
else:
    print('No encontrado')

conn.close()
