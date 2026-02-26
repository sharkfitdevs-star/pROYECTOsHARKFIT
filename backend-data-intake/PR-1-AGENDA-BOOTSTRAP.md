PR‑1: Agenda bootstrap + job definitions (starter)

Objetivo
- Implementar el bootstrap de Agenda en el servidor, definir los jobs principales y añadir pruebas de integración para replicar la política de reintentos/backoff y la persistencia de jobs.

Alcance inicial (esta PR)
- Añadir documentación y checklist para PR‑1 (este archivo).
- Añadir pruebas y scaffolding para las definiciones de jobs.
- No realizar migración de call‑sites ni eliminar Bull/Redis en esta PR.

Tareas (high‑level)
1. Inicializar Agenda durante el arranque de la aplicación (ya adelantado en PR‑0).
2. Definir jobs persistentes: `api-calls`, `webhooks`, `sync-tasks` (mapeo de opciones: attempts/backoff/priority).
3. Añadir tests de integración usando `mongodb-memory-server` para validar persistencia y reintentos.
4. Añadir health‑check `/api/health/agenda` y métricas para Jobs en `getWorkerStats()`.
5. Documentar variables de entorno necesarias (AGENDA_ENABLED, AGENDA_COLLECTION).
6. Añadir migración opcional de jobs pendentes (tema para PR‑2).

Criterios de aceptación
- Tests unitarios/presubida para job retries/backoff.
- Endpoint de health reportando estado de Agenda.
- Feature flag `AGENDA_ENABLED` controla activación en staging/producción.

Riesgos y mitigaciones
- Agenda depende de MongoDB: agregar `mongodb-memory-server` para CI local en tests.
- Cambios en semántica de retry — añadir pruebas que reproduzcan comportamiento de Bull.

Siguiente paso (después de merge PR‑0)
- Implementar job definitions y pruebas que confirmen equivalencia con Bull (intentos, backoff, DLQ).