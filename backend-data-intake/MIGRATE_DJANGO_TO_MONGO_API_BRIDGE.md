# Migración Django → MongoDB (API‑bridge)

Objetivo
- Migrar el *backend Django* para que use los datos persistidos en MongoDB **sin reescribir** toda la lógica de Django. La estrategia recomendada (opción B) es: migrar datos a Mongo y cambiar **accesos** de Django por llamadas a una API de compatibilidad que ya expone los mismos recursos (`/api/clientes`, `/api/ventas`, `/api/leads`).

Principales ventajas
- Cambios mínimos en Django (solo adaptadores/clients). 
- Permite validar datos en staging antes del cutover.
- Reduce riesgo: proceso reversible y probado con dry‑runs.

Alcance
- Datos migrados: `members` → `clientes`, `sales` → `ventas`, `prospects` → `leads`, `access_logs`.
- Django seguirá funcionando igual externamente (mismas rutas/serializers) pero internamente usará un cliente HTTP que consume el servicio Node/Mongo.

Fases (alto nivel)
1. Preparación (dry‑run) — exportar SQLite y validar conteos.
2. Migración de datos — export + import (Node importer ya incluido).
3. Implementar API‑bridge en Django (cliente HTTP + tests) — reemplazar selectores/queries puntuales.
4. Validación end‑to‑end en staging (UI smoke tests + conteos).
5. Cutover: switch read/write a Mongo (feature flag off → remove SQLite usage).
6. Cleanup: eliminar código SQLite y dejar Mongo como único store.

Comandos esenciales
- Dry‑run export:
  python backend-data-intake/scripts/export-sqlite-to-json.py --db-path backend/db.sqlite3 --out-dir backend-data-intake/migration-output --dry-run
- Export real:
  python backend-data-intake/scripts/export-sqlite-to-json.py --db-path backend/db.sqlite3 --out-dir backend-data-intake/migration-output
- Import dry‑run (Node):
  cd backend-data-intake && node scripts/import-json-to-mongo.js --input-dir migration-output --dry-run
- Import real (apuntar MONGODB_URI a destino):
  node scripts/import-json-to-mongo.js --input-dir migration-output

Django changes (resumen técnico)
- Añadir un `django_mongo_bridge` client (Python) que envuelva llamadas a `http(s)://<DATA-INTAKE>/api/*`.
- Reemplazar _selects_ pesadas / puntos de integración por llamadas al cliente: ej. `Clientes.get(id)` → `Bridge.get_client(id)`.
- Mantener serializadores/responses de Django igual para el frontend (adapter layer en vistas o managers).
- Añadir feature flag `USE_MONGO_BRIDGE` en `settings.py` para togglear comportamiento durante validación.

Ejemplo mínimo (pseudo‑código Django)

- Reemplazo en views o managers:
  ```py
  # Antes (ORM):
  cliente = Clientes.objects.get(pk=uuid)

  # Después (API‑bridge):
  from django_mongo_bridge import client
  cliente = client.get_client_by_id(uuid)
  ```

Validaciones y pruebas
- Conteo: comparar `SELECT COUNT(*) FROM members` vs `GET /api/clientes?limit=0` (o usar counts expuestos).
- Muestreo: verificar N registros aleatorios (fields clave: idMember/uniqueId, email, membershipStartDate).
- UI smoke: login + ver lista clientes + perfil cliente.
- CI: unit tests para `django_mongo_bridge` + contract tests (Jest) que validen shape de `/api/clientes` y `/api/ventas`.

Rollback
- Mantener copia de `db.sqlite3` antes de migración.
- Si fallo en producción: reconfigurar `USE_MONGO_BRIDGE=false` y seguir usando SQLite.

Checklist antes de cutover ✅
- [ ] Dry‑run import sin errores
- [ ] Conteos coincidentes (clientes, ventas, access_logs)
- [ ] Contract tests green (Node) — endpoints conservan shape
- [ ] Django tests green con `USE_MONGO_BRIDGE=true`
- [ ] Staging smoke tests OK

Siguientes pasos sugeridos
1. Ejecutar export + import en staging.
2. Implementar `django_mongo_bridge` en Django y activar `USE_MONGO_BRIDGE` en staging.
3. Validar conteos y UX; si OK, programar cutover en ventana de baja actividad.

Referencias
- Migración de datos: `backend-data-intake/scripts/export-sqlite-to-json.py` + `scripts/import-json-to-mongo.js`
- API Node (ya disponible): `GET /api/clientes`, `GET /api/ventas`, `GET /api/leads`
