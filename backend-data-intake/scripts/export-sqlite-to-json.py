#!/usr/bin/env python3
"""
Exportador SQLite -> JSON

Uso:
  python export-sqlite-to-json.py --db-path ../../backend/db.sqlite3 --out-dir migration-output

Este script extrae las tablas legacy (prospects, members, sales, access_logs, sync_queue)
desde el archivo SQLite y genera archivos JSON listos para importarse en MongoDB.

El objetivo es que `import-json-to-mongo.js` consuma esos archivos.
"""
import argparse
import sqlite3
import json
import os
from pathlib import Path

TABLES = [
    'prospects',
    'members',
    'sales',
    'access_logs',
    'sync_queue'
]


def row_to_dict(cursor, row):
    return {col[0]: row[idx] for idx, col in enumerate(cursor.description)}


def export_table(conn, table_name, out_dir):
    cur = conn.cursor()
    try:
        cur.execute(f"SELECT * FROM {table_name}")
    except sqlite3.OperationalError as e:
        print(f"[WARN] Tabla '{table_name}' no existe en la DB: {e}")
        return 0

    rows = [row_to_dict(cur, r) for r in cur.fetchall()]
    out_file = out_dir / f"{table_name}.json"
    with open(out_file, 'w', encoding='utf-8') as f:
        json.dump(rows, f, ensure_ascii=False, default=str, indent=2)

    print(f"[OK] Exported {len(rows)} rows -> {out_file}")
    return len(rows)


def main():
    parser = argparse.ArgumentParser(description='Export SQLite tables to JSON for Mongo import')
    parser.add_argument('--db-path', default='../../backend/db.sqlite3', help='Path to SQLite DB file')
    parser.add_argument('--out-dir', default='migration-output', help='Output directory for JSON files')
    parser.add_argument('--tables', default=','.join(TABLES), help='Comma-separated table names to export')
    parser.add_argument('--dry-run', action='store_true', help='Show counts only; do not write files')

    args = parser.parse_args()

    db_path = Path(args.db_path).resolve()
    if not db_path.exists():
        print(f"ERROR: SQLite DB not found at: {db_path}")
        return 2

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    conn = sqlite3.connect(str(db_path))

    tables = [t.strip() for t in args.tables.split(',') if t.strip()]
    summary = {}
    for t in tables:
        try:
            cur = conn.cursor()
            cur.execute(f"SELECT COUNT(*) FROM {t}")
            count = cur.fetchone()[0]
        except sqlite3.OperationalError:
            count = 0
        summary[t] = count

    print('\nExport summary:')
    for t, c in summary.items():
        print(f'  - {t}: {c} rows')

    if args.dry_run:
        print('\nDry-run mode: no se escribirán archivos')
        return 0

    for t in tables:
        export_table(conn, t, out_dir)

    conn.close()
    print('\nDone.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
