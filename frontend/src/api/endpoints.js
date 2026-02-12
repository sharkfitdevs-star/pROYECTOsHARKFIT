/**
 * Endpoints y URLs de la API
 * Mantener centralizado para fácil cambio
 */

export const API_ENDPOINTS = {
  // Auth
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    ME: '/auth/me',
    REFRESH: '/auth/refresh',
  },

  // Usuarios
  USUARIOS: {
    LIST: '/usuarios',
    CREATE: '/usuarios',
    DETAIL: (id) => `/usuarios/${id}`,
    UPDATE: (id) => `/usuarios/${id}`,
    DELETE: (id) => `/usuarios/${id}`,
    PROFILE: '/usuarios/profile',
  },

  // Clientes
  CLIENTES: {
    LIST: '/clientes',
    CREATE: '/clientes',
    DETAIL: (id) => `/clientes/${id}`,
    UPDATE: (id) => `/clientes/${id}`,
    DELETE: (id) => `/clientes/${id}`,
    SEARCH: '/clientes/search',
    EXPORTAR: '/clientes/export',
  },

  // Ventas
  VENTAS: {
    LIST: '/ventas',
    CREATE: '/ventas',
    DETAIL: (id) => `/ventas/${id}`,
    UPDATE: (id) => `/ventas/${id}`,
    DELETE: (id) => `/ventas/${id}`,
    ESTADO: (id) => `/ventas/${id}/estado`,
  },

  // Agendamientos
  AGENDAMIENTOS: {
    LIST: '/agendamientos',
    CREATE: '/agendamientos',
    DETAIL: (id) => `/agendamientos/${id}`,
    UPDATE: (id) => `/agendamientos/${id}`,
    DELETE: (id) => `/agendamientos/${id}`,
    CALENDAR: '/agendamientos/calendar',
  },

  // Alertas
  ALERTAS: {
    LIST: '/alertas',
    CREATE: '/alertas',
    DETAIL: (id) => `/alertas/${id}`,
    UPDATE: (id) => `/alertas/${id}`,
    DELETE: (id) => `/alertas/${id}`,
    PENDIENTES: '/alertas/pendientes',
    MARCAR_RESUELTA: (id) => `/alertas/${id}/resolver`,
  },

  // Reportes
  REPORTES: {
    SUMMARY: '/reportes/summary',
    VENTAS: '/reportes/ventas',
    CLIENTES: '/reportes/clientes',
    ALERTAS: '/reportes/alertas',
    CUSTOM: '/reportes/custom',
    EXPORTAR: '/reportes/export',
  },

  // Webhooks
  WEBHOOKS: {
    LIST: '/webhooks',
    CREATE: '/webhooks',
    DETAIL: (id) => `/webhooks/${id}`,
    UPDATE: (id) => `/webhooks/${id}`,
    DELETE: (id) => `/webhooks/${id}`,
    TEST: (id) => `/webhooks/${id}/test`,
  },
}

/**
 * Status codes HTTP
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_ERROR: 500,
}

/**
 * Query strings comunes
 */
export const QUERY_PARAMS = {
  PAGINATE: (page = 1, limit = 50) => ({
    page,
    limit,
  }),
  SEARCH: (q) => ({
    search: q,
  }),
  FILTER: (filters = {}) => filters,
  SORT: (field, order = 'asc') => ({
    sort: field,
    order,
  }),
}
