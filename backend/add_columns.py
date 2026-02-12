#!/usr/bin/env python
import os
import django
import sqlite3

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import connection

# Conexión directa a SQLite
conn = sqlite3.connect('db.sqlite3')
cursor = conn.cursor()

# Definición de todas las nuevas columnas por tabla
new_columns = {
    'prospects': [
        ('first_name', 'VARCHAR(255)'),
        ('last_name', 'VARCHAR(255)'),
        ('cellphone', 'VARCHAR(20)'),
        ('gender', 'VARCHAR(10)'),
        ('birthdate', 'VARCHAR(50)'),
        ('address', 'VARCHAR(255)'),
        ('city', 'VARCHAR(100)'),
        ('state', 'VARCHAR(100)'),
        ('zipcode', 'VARCHAR(20)'),
        ('branch_id', 'INTEGER'),
        ('branch_name', 'VARCHAR(100)'),
        ('signup_type', 'VARCHAR(50)'),
        ('marketing_channel', 'VARCHAR(100)'),
        ('current_step', 'VARCHAR(100)'),
        ('temperature', 'VARCHAR(50)'),
        ('notes', 'TEXT'),
    ],
    'members': [
        ('first_name', 'VARCHAR(255)'),
        ('last_name', 'VARCHAR(255)'),
        ('document', 'VARCHAR(50)'),
        ('gender', 'VARCHAR(10)'),
        ('birthdate', 'VARCHAR(50)'),
        ('marital_status', 'VARCHAR(50)'),
        ('phone', 'VARCHAR(20)'),
        ('email', 'VARCHAR(100)'),
        ('address', 'VARCHAR(255)'),
        ('city', 'VARCHAR(100)'),
        ('state', 'VARCHAR(100)'),
        ('zipcode', 'VARCHAR(20)'),
        ('branch_id', 'INTEGER'),
        ('branch_name', 'VARCHAR(100)'),
        ('registration_date', 'VARCHAR(50)'),
        ('status', 'VARCHAR(50)'),
        ('membership_status', 'VARCHAR(50)'),
        ('access_blocked', 'BOOLEAN'),
        ('blocked_reason', 'VARCHAR(255)'),
        ('consultant_name', 'VARCHAR(255)'),
        ('instructor_name', 'VARCHAR(255)'),
        ('personal_trainer_name', 'VARCHAR(255)'),
        ('last_access_date', 'VARCHAR(50)'),
    ],
    'sales': [
        ('member_name', 'VARCHAR(255)'),
        ('member_document', 'VARCHAR(50)'),
        ('member_phone', 'VARCHAR(20)'),
        ('member_email', 'VARCHAR(100)'),
        ('item_description', 'VARCHAR(255)'),
        ('item_quantity', 'INTEGER'),
        ('employee_name', 'VARCHAR(255)'),
        ('branch_id', 'INTEGER'),
        ('sale_source', 'VARCHAR(100)'),
        ('observations', 'TEXT'),
    ],
    'access_logs': [
        ('member_evo_id', 'INTEGER'),
        ('member_name', 'VARCHAR(255)'),
        ('branch_name', 'VARCHAR(100)'),
        ('entry_type', 'VARCHAR(100)'),
        ('device', 'VARCHAR(100)'),
        ('entry_action', 'VARCHAR(50)'),
        ('block_reason', 'VARCHAR(255)'),
    ],
}

# Para cada tabla, agregar las columnas que faltan
for table_name, columns in new_columns.items():
    for col_name, col_type in columns:
        try:
            # Intentar agregar la columna
            cursor.execute(f'ALTER TABLE {table_name} ADD COLUMN {col_name} {col_type};')
            print(f'✓ Added column {col_name} to {table_name}')
        except sqlite3.OperationalError as e:
            if 'already exists' in str(e):
                print(f'  Column {col_name} already exists in {table_name}')
            else:
                print(f'! Error adding {col_name} to {table_name}: {e}')

conn.commit()
conn.close()

print('\n✅ All columns added successfully!')
