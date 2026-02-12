import sqlite3

conn = sqlite3.connect('db.sqlite3')
cursor = conn.cursor()

print('[INFO] Buscando EDIXON CULTRERA en base de datos local\n')

# Buscar en ventas (sales)
cursor.execute('''
    SELECT 
        id, member_name, item_description, status,
        sale_date, amount, branch_id, employee_name
    FROM sales
    WHERE member_name LIKE '%EDIXON%' OR member_name LIKE '%CULTRERA%'
''')

sales = cursor.fetchall()

if sales:
    print('=== VENTAS ENCONTRADAS ===')
    for sale in sales:
        print(f'\nCliente: {sale[1]}')
        print(f'Plan/Producto: {sale[2]}')
        print(f'Estado: {sale[3]}')
        print(f'Fecha: {sale[4]}')
        amount = sale[5] if sale[5] else 'N/A'
        print(f'Monto: ${amount}')
        print(f'Branch: {sale[6]}')
        print(f'Vendedor: {sale[7]}')
        print('-' * 50)
else:
    print('[X] No se encontraron ventas para EDIXON CULTRERA en la BD local')
    print('\n[INFO] Verificando datos en Access Logs:')
    cursor.execute('''
        SELECT member_name, member_evo_id, entry_type, access_time
        FROM access_logs
        WHERE member_name LIKE '%EDIXON%'
        LIMIT 3
    ''')
    logs = cursor.fetchall()
    if logs:
        print('=== ACCESOS REGISTRADOS ===')
        for log in logs:
            print(f'Nombre: {log[0]}')
            print(f'EVO ID: {log[1]}')
            print(f'Tipo: {log[2]}')
            print(f'Fecha: {log[3]}')
            print('-' * 30)
    
    print('\n[CONCLUSION]')
    print('EDIXON CULTRERA tiene acceso al gimnasio (aparece en logs de entrada)')
    print('pero NO tiene ventas/planes registrados en la sincronizacion actual.')
    print('\nPosibles razones:')
    print('1. Membresia antigua (anterior a la sincronizacion)')
    print('2. Plan agregado manualmente en EVO5')
    print('3. Acceso de cortesia o empleado')
    print('4. Cliente de otro sistema (no W12App)')

conn.close()
