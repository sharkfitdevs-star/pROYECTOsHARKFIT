import sqlite3

conn = sqlite3.connect('db.sqlite3')
c = conn.cursor()

print('=' * 80)
print('  VERIFICACIÓN DE DATOS SINCRONIZADOS - VENDIFY')
print('=' * 80)

print('\n📊 PROSPECTS')
c.execute('SELECT COUNT(*) FROM prospects')
total = c.fetchone()[0]
print(f'Total: {total} registros')
c.execute('SELECT evo_prospect_id, name, email FROM prospects LIMIT 5')
for row in c.fetchall():
    print(f'  • {row[0]}: {row[1][:30]:<30} - {row[2]}')

print('\n💰 SALES')
c.execute('SELECT COUNT(*) FROM sales')
total = c.fetchone()[0]
print(f'Total: {total} registros')
c.execute('SELECT evo_sale_id, amount, status, sale_date FROM sales LIMIT 5')
for row in c.fetchall():
    date = row[3][:10] if row[3] else 'N/A'
    print(f'  • Sale #{row[0]}: ${row[1]:,.0f} - {row[2]} ({date})')

print('\n🚪 ACCESS ENTRIES')
c.execute('SELECT COUNT(*) FROM access_logs')
total = c.fetchone()[0]
print(f'Total: {total} registros')
c.execute('SELECT access_time, location FROM access_logs ORDER BY access_time DESC LIMIT 5')
for row in c.fetchall():
    timestamp = row[0][:16] if row[0] else 'N/A'
    print(f'  • {timestamp} - Branch {row[1]}')

print('\n📝 SYNC LOGS')
c.execute('SELECT job_type, status, created_at FROM sync_queue ORDER BY created_at DESC LIMIT 3')
for row in c.fetchall():
    print(f'  • {row[0]}: {row[1]} at {row[2][:19]}')

print('\n' + '=' * 80)
print('✅ Verificación completada')
print('=' * 80)

conn.close()
