import sqlite3, os
path = r"c:\Users\vecch\OneDrive\Escritorio\Dashboard Sharkfit 30 enero - Copy-export (1)\backend\db.sqlite3"
print('DB exists', os.path.exists(path))
conn = sqlite3.connect(path)
cur = conn.cursor()
cur.execute("SELECT name, type FROM sqlite_master WHERE type IN ('table','view') ORDER BY name")
print('TABLES:')
for r in cur.fetchall():
    print(r)
print('---')
cur.execute("SELECT sql FROM sqlite_master WHERE sql IS NOT NULL ORDER BY tbl_name, type")
for r in cur.fetchall():
    if r[0]:
        print(r[0])
