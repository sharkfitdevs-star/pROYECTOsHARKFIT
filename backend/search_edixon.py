import requests
import json

dns = 'sharkfitchile'
token = 'FB109206-CE01-4160-BCDF-8389B8725276'
base_url = f'https://{dns}.w12app.com.br'
headers = {'Authorization': f'Basic {token}'}

print('[SEARCH] Buscando informacion de EDIXON CULTRERA en EVO W12\n')

# Buscar en ventas (sales)
try:
    response = requests.get(f'{base_url}/api/v2/sales', headers=headers, timeout=15)
    if response.status_code == 200:
        sales_data = response.json()
        sales = sales_data if isinstance(sales_data, list) else sales_data.get('list', [])
        
        print(f'Total ventas obtenidas: {len(sales)}\n')
        
        found = False
        for sale in sales:
            member = sale.get('member', {})
            first_name = member.get('firstName', '')
            last_name = member.get('lastName', '')
            full_name = f'{first_name} {last_name}'.strip()
            
            if 'EDIXON' in full_name.upper() or 'CULTRERA' in full_name.upper():
                found = True
                print('=== VENTA ENCONTRADA ===')
                print(f'Cliente: {full_name}')
                sale_date = sale.get('saleDate', 'N/A')
                print(f'Fecha venta: {sale_date}')
                reg_kind = sale.get('registrationKind', 'N/A')
                print(f'Tipo: {reg_kind}')
                
                # Items de la venta
                items = sale.get('saleItens', [])
                if items:
                    print(f'\nPlan/Producto comprado:')
                    for item in items:
                        desc = item.get('description', 'Sin descripcion')
                        print(f'  - {desc}')
                        value = item.get('saleValue', 0)
                        print(f'    Valor: ${value}')
                        qty = item.get('quantity', 1)
                        print(f'    Cantidad: {qty}')
                
                # Info del miembro
                doc = member.get('document', 'N/A')
                print(f'\nDocumento: {doc}')
                contacts = member.get('contacts', [])
                for contact in contacts:
                    contact_type = contact.get('type', '')
                    contact_value = contact.get('value', '')
                    print(f'{contact_type.title()}: {contact_value}')
                
                branch = sale.get('idBranch', 'N/A')
                print(f'Branch: {branch}')
                employee = sale.get('nameEmployeeSale', 'N/A')
                print(f'Vendedor: {employee}')
                print('\n' + '-' * 50 + '\n')
        
        if not found:
            print('[X] No se encontro ninguna venta para EDIXON CULTRERA')
            print('\n[INFO] Esto puede significar que:')
            print('   1. No ha realizado compras recientemente')
            print('   2. Es un miembro antiguo (plan anterior a sincronizacion)')
            print('   3. Su membresia fue agregada directamente en el sistema')
    else:
        print(f'[WARN] Error al obtener ventas: {response.status_code}')
except Exception as e:
    print(f'[ERROR] {e}')
