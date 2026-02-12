import sqlite3

db_path = 'db.sqlite3'
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

branches = cursor.fetchall()

print("\n" + "="*80)
print("SUCURSALES REGISTRADAS EN LA BASE DE DATOS")
print("="*80)

if branches:
    print(f"\nTotal de sucursales encontradas: {len(branches)}\n")
    
    for branch in branches:
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
    print(f"⚠️  Miembros sin sucursal asignada: {sin_sucursal}")

conn.close()
