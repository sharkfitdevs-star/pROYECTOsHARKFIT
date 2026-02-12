/**
 * Constantes globales de la aplicación
 */

// Estados de clientes
export const CLIENTE_ESTADOS = {
  PROSPECTO: 'Prospecto',
  ACTIVO: 'Activo',
  SUSPENDIDO: 'Suspendido',
  BAJA: 'Baja',
}

// Estados de ventas
export const VENTA_ESTADOS = {
  NUEVA: 'Nueva',
  EN_PROCESO: 'En proceso',
  COMPLETADA: 'Completada',
  CANCELADA: 'Cancelada',
  DEVUELTA: 'Devuelta',
}

// Tipos de venta
export const VENTA_TIPOS = {
  NUEVA_AFILIACION: 'Nueva afiliación',
  RENOVACION: 'Renovación',
  UPGRADE: 'Upgrade',
  DOWNGRADE: 'Downgrade',
  REACTIVACION: 'Reactivación',
}

// Estados de agendamiento
export const AGENDAMIENTO_ESTADOS = {
  CONFIRMADO: 'Confirmado',
  PENDIENTE: 'Pendiente',
  REALIZADO: 'Realizado',
  CANCELADO: 'Cancelado',
  NO_ASISTIO: 'No asistió',
}

// Tipos de alerta
export const ALERTA_TIPOS = {
  CLIENTE_NUEVO: 'Cliente Nuevo',
  RENOVACION: 'Renovación próxima',
  DEUDOR: 'Cliente Deudor',
  CLIENTE_RIESGO: 'Cliente en Riesgo',
  VENCIMIENTO_CONTRATO: 'Vencimiento de Contrato',
  SEGUIMIENTO: 'Seguimiento requerido',
}

// Prioridades de alerta
export const ALERTA_PRIORIDADES = {
  BAJA: 'Baja',
  MEDIA: 'Media',
  ALTA: 'Alta',
  CRITICA: 'Crítica',
}

// Colores por estado/prioridad
export const COLOR_ESTADO = {
  // Clientes
  Prospecto: '#FFA500',
  Activo: '#22C55E',
  Suspendido: '#F59E0B',
  Baja: '#EF4444',
  // Ventas
  Nueva: '#3B82F6',
  'En proceso': '#FFA500',
  Completada: '#22C55E',
  Cancelada: '#EF4444',
  Devuelta: '#9CA3AF',
  // Alertas
  Baja: '#DBEAFE',
  Media: '#FEF3C7',
  Alta: '#FECACA',
  Crítica: '#FCA5A5',
}

// Paginación
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 50,
  PAGE_SIZES: [10, 25, 50, 100],
}

// Configuración de tiempo
export const TIME_CONFIG = {
  LOCALE: 'es-AR',
  TIMEZONE: 'America/Argentina/Buenos_Aires',
  DATE_FORMAT: 'DD/MM/YYYY',
  TIME_FORMAT: 'HH:mm',
  DATETIME_FORMAT: 'DD/MM/YYYY HH:mm',
}

// Rutas de la aplicación
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  CLIENTES: '/dashboard/clientes',
  VENTAS: '/dashboard/ventas',
  AGENDAMIENTOS: '/dashboard/agendamientos',
  ALERTAS: '/dashboard/alertas',
  REPORTES: '/dashboard/reportes',
  PERFIL: '/dashboard/perfil',
  CONFIGURACION: '/dashboard/configuracion',
}

// Mensajes comunes
export const MENSAJES = {
  CARGANDO: 'Cargando...',
  ERROR: 'Ha ocurrido un error',
  EXITO: 'Operación completada exitosamente',
  CONFIRMACION: '¿Está seguro?',
  CREADO: 'Creado exitosamente',
  ACTUALIZADO: 'Actualizado exitosamente',
  ELIMINADO: 'Eliminado exitosamente',
  ERROR_CREAR: 'Error al crear',
  ERROR_ACTUALIZAR: 'Error al actualizar',
  ERROR_ELIMINAR: 'Error al eliminar',
  SIN_DATOS: 'No hay datos para mostrar',
}

// Límites
export const LIMITS = {
  MAX_ARCHIVO_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_BUSQUEDA: 1000,
  TIMEOUT_REQUEST: 30000, // 30 segundos
}

// Validaciones
export const VALIDACIONES = {
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  TELEFONO_REGEX: /^(\+?56)?[0-9]{9,10}$/,
  RUT_REGEX: /^\d{1,2}\.\d{3}\.\d{3}-[\dKk]$/,
  URL_REGEX: /^https?:\/\/.+/,
}
