import sqlite3

conn = sqlite3.connect('db.sqlite3')
cursor = conn.cursor()

# Total members
cursor.execute('SELECT COUNT(*) FROM members')
total = cursor.fetchone()[0]
print(f'Total members en BD: {total}')
print('=' * 80)

# Members con plan activo
cursor.execute("SELECT COUNT(*) FROM members WHERE membership_status = 'active'")
active = cursor.fetchone()[0]
print(f'Members con plan ACTIVO: {active}')

# Members inactivos
cursor.execute("SELECT COUNT(*) FROM members WHERE membership_status != 'active' OR membership_status IS NULL")
inactive = cursor.fetchone()[0]
print(f'Members INACTIVOS: {inactive}')

print()
print('=' * 80)
print('PRIMEROS 10 MEMBERS:')
print('=' * 80)

cursor.execute("""
    SELECT name, membership_status, branch_name, phone 
    FROM members 
    LIMIT 10
""")

for row in cursor.fetchall():
    name = row[0] or 'N/A'
    status = row[1] or 'N/A'
    branch = row[2] or 'N/A'
    phone = row[3] or 'N/A'
    print(f'{name:30} | {status:10} | {branch[:20]:20} | {phone}')

conn.close()
