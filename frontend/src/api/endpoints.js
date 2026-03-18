/**
 * Endpoints y URLs de la API — v2
 * Mantener centralizado para fácil cambio.
 */

export const API_ENDPOINTS = {

  AUTH: {
    LOGIN:    '/auth/login',
    LOGOUT:   '/auth/logout',
    ME:       '/auth/me',
    REFRESH:  '/auth/refresh',
    REGISTER: '/auth/register',
  },

  USUARIOS: {
    LIST:    '/usuarios',
    CREATE:  '/usuarios',
    DETAIL:  (id) => `/usuarios/${id}`,
    UPDATE:  (id) => `/usuarios/${id}`,
    DELETE:  (id) => `/usuarios/${id}`,
    PROFILE: '/usuarios/profile',
  },

  CLIENTES: {
    LIST:     '/clientes',
    CREATE:   '/clientes',
    DETAIL:   (id) => `/clientes/${id}`,
    UPDATE:   (id) => `/clientes/${id}`,
    DELETE:   (id) => `/clientes/${id}`,
    SEARCH:   '/clientes/search',
    EXPORTAR: '/clientes/export',
  },

  VENTAS: {
    LIST:   '/ventas',
    CREATE: '/ventas',
    DETAIL: (id) => `/ventas/${id}`,
    UPDATE: (id) => `/ventas/${id}`,
    DELETE: (id) => `/ventas/${id}`,
    ESTADO: (id) => `/ventas/${id}/estado`,
  },

  AGENDAMIENTOS: {
    LIST:     '/agendamientos',
    CREATE:   '/agendamientos',
    DETAIL:   (id) => `/agendamientos/${id}`,
    UPDATE:   (id) => `/agendamientos/${id}`,
    DELETE:   (id) => `/agendamientos/${id}`,
    CALENDAR: '/agendamientos/calendar',
  },

  ALERTAS: {
    // CRUD base
    LIST:   '/alertas',
    CREATE: '/alertas',
    DETAIL: (id) => `/alertas/${id}`,
    UPDATE: (id) => `/alertas/${id}`,
    DELETE: (id) => `/alertas/${id}`,

    // Consultas especializadas
    PENDIENTES:     '/alertas/pendientes',          // GET — activas (pendiente + en_proceso)
    STATS:          '/alertas/stats',               // GET — contadores del dashboard

    // Transiciones de estado
    CAMBIAR_ESTADO: (id) => `/alertas/${id}/estado`,       // PUT — con validación de flujo
    ASIGNAR:        (id) => `/alertas/${id}/asignar`,      // POST — asignar responsable → en_proceso
    RESOLVER:       (id) => `/alertas/${id}/resolver`,     // POST — marcar resuelta
    DESCARTAR:      (id) => `/alertas/${id}/descartar`,    // POST — marcar descartada

    // Motor KPI
    CALCULAR_KPIS:    '/alertas/calcular-kpis',            // POST — disparo manual
    ULTIMO_REPORTE:   '/alertas/kpi/ultimo-reporte',       // GET  — última ejecución KPI
  },

  REPORTES: {
    SUMMARY:  '/reportes/summary',
    VENTAS:   '/reportes/ventas',
    CLIENTES: '/reportes/clientes',
    ALERTAS:  '/reportes/alertas',
    CUSTOM:   '/reportes/custom',
    EXPORTAR: '/reportes/export',
  },

  WEBHOOKS: {
    LIST:   '/webhooks',
    CREATE: '/webhooks',
    DETAIL: (id) => `/webhooks/${id}`,
    UPDATE: (id) => `/webhooks/${id}`,
    DELETE: (id) => `/webhooks/${id}`,
    TEST:   (id) => `/webhooks/${id}/test`,
  },

  EXTRACTOR: {
    CONFIG:        '/extractor/config',
    CONFIG_DELETE: (name) => `/extractor/config/${name}`,
    RUN:           '/extractor/run',
    RESOLVE:       '/extractor/resolve',
    STATUS:        (jobId) => `/extractor/status/${jobId}`,
    LOGS:          '/extractor/logs',
  },

  IMPORT: {
    EXCEL:  '/import/excel',
    STATUS: (jobId) => `/import/status/${jobId}`,
    LOGS:   '/import/logs',
  },
};

export const HTTP_STATUS = {
  OK:             200,
  CREATED:        201,
  BAD_REQUEST:    400,
  UNAUTHORIZED:   401,
  FORBIDDEN:      403,
  NOT_FOUND:      404,
  CONFLICT:       409,
  UNPROCESSABLE:  422,
  INTERNAL_ERROR: 500,
};

export const QUERY_PARAMS = {
  // FIX: el router espera 'page', no 'skip'
  PAGINATE: (page = 1, limit = 50) => ({ page, limit }),
  SEARCH:   (q)                    => ({ search: q }),
  FILTER:   (filters = {})         => filters,
  SORT:     (field, order = 'asc') => ({ sort: field, order }),
};
