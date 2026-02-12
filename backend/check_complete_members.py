import sqlite3

conn = sqlite3.connect('db.sqlite3')
cursor = conn.cursor()

print('=' * 100)
print('MEMBERS CON DATOS COMPLETOS (Plan + Sucursal):')
print('=' * 100)

cursor.execute("""
    SELECT name, membership_status, status, branch_name, phone, email
    FROM members 
    WHERE membership_status IS NOT NULL 
      AND branch_name IS NOT NULL
    ORDER BY name
    LIMIT 20
""")

for row in cursor.fetchall():
    name = (row[0] or 'N/A')[:35]
    mem_status = (row[1] or 'N/A')[:10]
    status = (row[2] or 'N/A')[:10]
    branch = (row[3] or 'N/A')[:30]
    phone = (row[4] or 'N/A')[:15]
    
    print(f'{name:36} | Plan: {mem_status:10} | Status: {status:10} | {branch:31} | {phone}')

print()
print('=' * 100)

conn.close()
