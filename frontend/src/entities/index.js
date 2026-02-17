/**
 * Mock Entities
 * Placeholders para prevenir errores de importación
 */

const createEntity = (name) => ({
  list: async (sort) => [],
  get: async (id) => null,
  create: async (data) => data,
  update: async (id, data) => data,
  delete: async (id) => true
});

export const Prospectos = createEntity('Prospectos');
export const Agendamientos = createEntity('Agendamientos');
export const Ventas = createEntity('Ventas');
export const Clientes = createEntity('Clientes');
export const Sucursales = createEntity('Sucursales');
export const Staff = createEntity('Staff');
export const Planes_Servicios = createEntity('Planes_Servicios');
export const Ciclos_Retencion = createEntity('Ciclos_Retencion');
export const Seguimiento_Online = createEntity('Seguimiento_Online');
export const Configuracion_Alertas = createEntity('Configuracion_Alertas');
export const Tareas_RS = createEntity('Tareas_RS');
export const Onboarding_Clientes = createEntity('Onboarding_Clientes');
export const Checklist_Templates = createEntity('Checklist_Templates');
export const Checklist_Items = createEntity('Checklist_Items');
export const Checklist_Asignados = createEntity('Checklist_Asignados');
export const Checklist_Ejecuciones = createEntity('Checklist_Ejecuciones');
export const Alertas_Checklist = createEntity('Alertas_Checklist');
export const Leads_Diarios = createEntity('Leads_Diarios');

export default {
  Prospectos,
  Agendamientos,
  Ventas,
  Clientes,
  Sucursales,
  Staff
};
