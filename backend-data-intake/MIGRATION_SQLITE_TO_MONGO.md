# Migración SQLite → MongoDB (EVO proxy / intake)

Resumen rápido
- Este repo ya usa MongoDB para el *data-intake* (proxy + microservicios).
- El objetivo del script es migrar los datos *históricos* que siguen en SQLite (Django) a MongoDB.

Contenido de la migración
- Tablas legacy en SQLite a migrar:
  - `prospects`  → `leads` (colección `leads`)
  - `members`    → `clientes` (colección `clientes`)
  - `sales`      → `ventas` (colección `ventas`)
  - `access_logs`→ `access_logs` (colección `access_logs`)
  - `sync_queue` → `sync_logs` (colección `sync_logs`)

Herramientas incluidas
- `scripts/export-sqlite-to-json.py` — exportador Python (usa sqlite3 builtin) → genera JSON en `migration-output/`.
- `scripts/import-json-to-mongo.js` — importador Node (usa Mongoose models) con `--dry-run`.
- `scripts/migrate-sqlite-to-mongo.js` — wrapper que ejecuta export + import.

Modo recomendado (dry-run primero)
1. Exportar (dry-run / conteo):
   python backend-data-intake/scripts/export-sqlite-to-json.py --db-path backend/db.sqlite3 --out-dir backend-data-intake/migration-output --dry-run
2. Generar archivos reales:
   python backend-data-intake/scripts/export-sqlite-to-json.py --db-path backend/db.sqlite3 --out-dir backend-data-intake/migration-output
3. Dry-run importer (ver qué se insertaría):
   cd backend-data-intake
   node scripts/import-json-to-mongo.js --input-dir migration-output --dry-run
4. Ejecutar import real (en entorno con MONGODB_URI apuntando al destino):
   node scripts/import-json-to-mongo.js --input-dir migration-output

Notas importantes
- Preservación de IDs: el exporter mantiene el campo `id` original (UUID) y el importador lo guarda en `externalId`/`uniqueId` según corresponda; las claves únicas en Mongo se basan en `idMember`, `idSale`, `leadId`.
- Relaciones: `sales.member_id` apunta al `members.id` (UUID). El importador copia `member_id` en el campo `idMember` de la venta para que coincida con el `idMember` del cliente migrado.
- Rollback: el importador usa upserts; para rollback deberías eliminar documentos creados por `externalId` o `source: 'evo'` y revisar duplicados.

Pruebas
- Incluido test unitario para el importador (`tests/migration.import.test.js`) que usa `mongodb-memory-server`.

Django → Mongo (API‑bridge)
- Para minimizar cambios en Django, existe una guía y cliente para implementar un API‑bridge (consumir `/api/clientes`, `/api/ventas`, `/api/leads`). Ver: `MIGRATE_DJANGO_TO_MONGO_API_BRIDGE.md`.

¿Quieres que:
- ejecute un `dry-run` localmente con tu `backend/db.sqlite3`, o
- genere un PR que implemente el cliente Django + tests (API‑bridge)?
