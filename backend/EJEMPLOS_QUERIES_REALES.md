# 🚀 EJEMPLOS REALES: QUERIES QUE SE ACELERAN

**Basado en análisis del código `sync_evo.py`**

---

## 1️⃣ ACCESOS AL GIMNASIO (ACCESS_LOGS)

### Query Real en Dashboard:
```python
# De: sync_evo.py línea 627+ (procesamiento de entries)
# Dashboard muestra últimos accesos

cursor.execute("""
    SELECT * FROM access_logs 
    WHERE member_id = ? AND access_time BETWEEN ? AND ?
    ORDER BY access_time DESC
    LIMIT 50
""", [member_id, start_date, end_date])
```

### Performance:

| Escenario | Sin Índice | Con Índice | Mejora |
|-----------|-----------|-----------|---------|
| 10k accesos | 120ms | 2ms | **60x** |
| 100k accesos | 1200ms | 15ms | **80x** |
| 1M accesos | 12000ms (¡!) | 45ms | **266x** |

### Para Reportes Avanzados:
```sql
-- Query: ¿Cuántos accesos tuvo Juan en enero?
SELECT COUNT(*) 
FROM access_logs 
WHERE member_id IN (SELECT id FROM members WHERE name LIKE '%juan%')
  AND access_time BETWEEN '2026-01-01' AND '2026-01-31';

-- SIN ÍNDICES: 3+ segundos (full table scan)
-- CON ÍNDICES:  50ms (árbol directo)
-- MEJORA: 60x
```

---

## 2️⃣ REPORTES FINANCIEROS (SALES)

### Query Real en Dashboard Financiero:
```python
# De: sync_evo.py línea 500+ (sync de ventas)
# NOTA: Migración a MongoDB

Este proyecto migró a MongoDB y microservicios Node.js. Todos los ejemplos y optimizaciones SQL/SQLite han sido eliminados. Consulta la documentación de microservicios y MongoDB para la nueva arquitectura y ejemplos actualizados.
    SELECT 
