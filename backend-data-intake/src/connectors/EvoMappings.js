/**
 * EVO API - Mapeos predeterminados de endpoints conocidos
 * Cada entrada define cómo extraer y mapear datos de EVO hacia
 * los modelos internos Venta y Cliente.
 */

const EVO_KNOWN_ENDPOINTS = [
  {
    path: '/api/v2/sales',
    name: 'Ventas EVO v2',
    dataType: 'ventas',
    description: 'Ventas completas con monto, sede y vendedor',
    dataPath: 'items',
    pagination: { type: 'take-skip', limit: 100 },
    mapTo: (item) => ({
      ventaId: item.id || item.code,
      eventoVentaId: String(item.id || ''),
      monto: item.value || item.amount || item.totalAmount || 0,
      totalAmount: item.value || item.totalAmount || 0,
      discount: item.discount || 0,
      nombreCliente: item.prospect_name || item.memberName || item.name,
      idMember: item.prospect_id || item.idMember || item.member_id,
      sede: item.branch || item.branchName || item.branch_name,
      idBranch: item.branch_id || item.idBranch,
      fecha: item.sale_date || item.saleDate || item.date,
      dueDate: item.due_date || item.dueDate,
      estatus: item.status || item.paymentStatus || 'Pendiente',
      paymentMethod: item.payment_method || item.paymentMethod,
      planName: item.plan || item.plan_name || item.planName,
      saleType: item.type || item.sale_type || item.saleType,
      description: item.description || item.obs || item.plan_name,
      employeeName: item.employee || item.employee_name || item.employeeName,
      cellPhone: item.cell_phone || item.cellPhone || item.whatsapp,
      fuente: 'evo-api'
    })
  },
  {
    path: '/api/v1/sales/by-session-id',
    name: 'Ventas por sesión EVO',
    dataType: 'ventas',
    description: 'Ventas indexadas por session ID',
    dataPath: 'items',
    pagination: { type: 'take-skip', limit: 100 },
    mapTo: (item) => ({
      ventaId: item.id || item.code || item.sale_id,
      eventoVentaId: String(item.id || item.session_id || ''),
      monto: item.value || item.amount || 0,
      totalAmount: item.total || item.value || 0,
      nombreCliente: item.member_name || item.prospect_name || item.name,
      idMember: item.member_id || item.prospect_id,
      sede: item.branch || item.branch_name,
      idBranch: item.branch_id,
      fecha: item.sale_date || item.date || item.created_at,
      estatus: item.status || 'Pendiente',
      planName: item.plan || item.plan_name,
      saleType: item.type || item.sale_type,
      fuente: 'evo-api'
    })
  },
  {
    path: '/api/v1/prospects',
    name: 'Prospectos EVO',
    dataType: 'clientes',
    description: 'Prospectos/leads del gimnasio',
    dataPath: 'items',
    pagination: { type: 'take-skip', limit: 100 },
    mapTo: (item) => ({
      clienteId: String(item.id || item.prospect_id || ''),
      uniqueId: String(item.id || item.prospect_id || ''),
      nombre: item.name || `${item.first_name || ''} ${item.last_name || ''}`.trim(),
      email: item.email,
      telefono: item.phone || item.cell_phone || item.cellPhone,
      empresa: item.branch || item.branch_name,
      idBranch: item.branch_id,
      estado: 'prospecto',
      active: false,
      registrationDate: item.registration_date || item.created_at,
      fuente: 'evo-api'
    })
  },
  {
    path: '/api/v1/members',
    name: 'Miembros EVO',
    dataType: 'clientes',
    description: 'Miembros activos e inactivos',
    dataPath: 'items',
    pagination: { type: 'take-skip', limit: 100 },
    mapTo: (item) => ({
      clienteId: String(item.id || item.member_id || ''),
      uniqueId: String(item.id || item.member_id || ''),
      nombre: item.name || `${item.first_name || ''} ${item.last_name || ''}`.trim(),
      email: item.email,
      telefono: item.cell_phone || item.phone || item.cellPhone,
      empresa: item.branch || item.branch_name,
      idBranch: item.branch_id,
      estado: item.active ? 'activo' : 'inactivo',
      active: !!item.active,
      sex: item.sex || item.gender,
      birthDate: item.birth_date || item.birthDate,
      membershipStatus: item.membership_status || item.membershipStatus,
      membershipStartDate: item.membership_start || item.membershipStartDate,
      membershipEndDate: item.membership_end || item.due_date || item.membershipEndDate,
      planName: item.plan || item.plan_name || item.planName,
      planValue: item.plan_value || item.planValue || item.monthly_fee,
      registrationDate: item.registration_date || item.created_at,
      fuente: 'evo-api'
    })
  },
  {
    path: '/api/v1/members/services',
    name: 'Servicios de miembros EVO',
    dataType: 'ventas',
    description: 'Servicios/planes activos por miembro',
    dataPath: 'items',
    pagination: { type: 'take-skip', limit: 100 },
    mapTo: (item) => ({
      ventaId: `svc-${item.id || item.service_id || item.member_id}`,
      eventoVentaId: String(item.id || ''),
      idMember: String(item.member_id || item.idMember || ''),
      nombreCliente: item.member_name || item.memberName,
      monto: item.value || item.price || item.amount || 0,
      totalAmount: item.total || item.value || 0,
      planName: item.service || item.plan || item.service_name || item.plan_name,
      saleType: 'Servicio',
      description: item.service || item.service_name || item.description,
      sede: item.branch || item.branch_name,
      idBranch: item.branch_id,
      fecha: item.start_date || item.created_at,
      dueDate: item.end_date || item.due_date,
      estatus: item.status || item.active ? 'Activo' : 'Vencido',
      fuente: 'evo-api'
    })
  },
  {
    path: '/api/v1/payables',
    name: 'Cuentas por cobrar EVO',
    dataType: 'ventas',
    description: 'Pagos pendientes y realizados',
    dataPath: 'items',
    pagination: { type: 'take-skip', limit: 100 },
    mapTo: (item) => ({
      ventaId: `pay-${item.id || item.payable_id}`,
      eventoVentaId: String(item.id || ''),
      idMember: String(item.member_id || item.idMember || ''),
      nombreCliente: item.member_name || item.memberName,
      monto: item.value || item.amount || item.total || 0,
      totalAmount: item.total || item.value || 0,
      discount: item.discount || 0,
      paymentMethod: item.payment_type || item.payment_method,
      estatus: item.status || item.paid ? 'Pagado' : 'Pendiente',
      paymentStatus: item.paid ? 'Pagado' : (item.status || 'Pendiente'),
      fecha: item.competence || item.due_date || item.created_at,
      dueDate: item.due_date || item.competence,
      planName: item.description || item.plan_name,
      description: item.description || item.obs,
      sede: item.branch || item.branch_name,
      idBranch: item.branch_id,
      fuente: 'evo-api'
    })
  },
  {
    path: '/api/v1/revenuecenter',
    name: 'Centro de ingresos EVO',
    dataType: 'ventas',
    description: 'Ingresos agrupados por centro de costo',
    dataPath: 'items',
    pagination: { type: 'take-skip', limit: 100 },
    mapTo: (item) => ({
      ventaId: `rev-${item.id || item.revenue_id || item.code}`,
      eventoVentaId: String(item.id || ''),
      monto: item.value || item.amount || item.revenue || 0,
      totalAmount: item.total || item.value || 0,
      description: item.description || item.revenue_center || item.name,
      saleType: item.type || item.category || 'Ingreso',
      planName: item.plan || item.product || item.revenue_center,
      sede: item.branch || item.branch_name,
      idBranch: item.branch_id,
      fecha: item.date || item.competence || item.created_at,
      estatus: item.status || 'Completado',
      fuente: 'evo-api'
    })
  },
  {
    path: '/api/v1/membermembership/:idMemberMembership',
    name: 'Membresía por miembro EVO',
    dataType: 'clientes',
    description: 'Detalle de membresía activa de un miembro específico',
    dataPath: 'items',
    pagination: { type: 'take-skip', limit: 100 },
    mapTo: (item) => ({
      uniqueId: String(item.idMemberMembership || item.id || ''),
      idMember: String(item.idMember || item.member_id || ''),
      clienteId: String(item.idMember || item.member_id || ''),
      nombre: item.memberName || item.member_name || item.name,
      name: item.memberName || item.member_name || item.name,
      email: item.email || null,
      telefono: item.cellPhone || item.cell_phone || item.phone,
      cellPhone: item.cellPhone || item.cell_phone,
      idBranch: item.idBranch || item.branch_id,
      empresa: item.branchName || item.branch_name,
      branchName: item.branchName || item.branch_name,
      membershipStatus: item.membershipStatus || item.status || item.membership_status,
      membershipStartDate: item.startDate || item.start_date || item.membershipStartDate,
      membershipEndDate: item.endDate || item.end_date || item.dueDate || item.due_date,
      planName: item.membershipName || item.plan || item.plan_name || item.planName,
      planValue: parseFloat(item.value || item.planValue || item.plan_value || 0),
      active: item.active !== undefined ? !!item.active : true,
      estado: item.active ? 'activo' : 'inactivo',
      registrationDate: item.startDate || item.start_date || item.created_at,
      fuente: 'evo-api'
    })
  },
  {
    path: '/api/v2/management/activeclients',
    name: 'Clientes activos EVO (management)',
    dataType: 'clientes',
    description: 'Clientes con membresía activa según gestión EVO',
    dataPath: 'clients',
    pagination: { type: 'take-skip', limit: 100 },
    mapTo: (item) => ({
      uniqueId: String(item.id || item.idMember || item.member_id || ''),
      idMember: String(item.id || item.idMember || item.member_id || ''),
      clienteId: String(item.id || item.idMember || ''),
      nombre: item.name || `${item.firstName || item.first_name || ''} ${item.lastName || item.last_name || ''}`.trim(),
      name: item.name || `${item.firstName || ''} ${item.lastName || ''}`.trim(),
      email: item.email || null,
      telefono: item.cellPhone || item.cell_phone || item.phone,
      cellPhone: item.cellPhone || item.cell_phone,
      idBranch: item.idBranch || item.branch_id,
      empresa: item.branchName || item.branch_name,
      branchName: item.branchName || item.branch_name,
      active: true,
      estado: 'activo',
      status: 'activo',
      membershipStatus: item.membershipStatus || item.membership_status || 'active',
      membershipEndDate: item.membershipEnd || item.membership_end || item.dueDate || item.due_date,
      planName: item.plan || item.plan_name || item.membershipName,
      planValue: parseFloat(item.planValue || item.plan_value || item.value || 0),
      registrationDate: item.registrationDate || item.registration_date || item.created_at,
      sex: item.sex || item.gender,
      birthDate: item.birthDate || item.birth_date,
      fuente: 'evo-api'
    })
  },
  {
    path: '/api/v2/management/prospects',
    name: 'Prospectos EVO (management)',
    dataType: 'clientes',
    description: 'Leads y prospectos desde módulo de gestión EVO',
    dataPath: 'prospects',
    pagination: { type: 'take-skip', limit: 100 },
    mapTo: (item) => ({
      uniqueId: String(item.id || item.idProspect || item.prospect_id || ''),
      idMember: String(item.id || item.idProspect || ''),
      clienteId: String(item.id || item.idProspect || ''),
      nombre: item.name || `${item.firstName || item.first_name || ''} ${item.lastName || item.last_name || ''}`.trim(),
      name: item.name || `${item.firstName || ''} ${item.lastName || ''}`.trim(),
      email: item.email || null,
      telefono: item.cellPhone || item.cell_phone || item.phone,
      cellPhone: item.cellPhone || item.cell_phone,
      idBranch: item.idBranch || item.branch_id,
      empresa: item.branchName || item.branch_name,
      branchName: item.branchName || item.branch_name,
      active: false,
      estado: 'prospecto',
      status: 'prospecto',
      registrationDate: item.registrationDate || item.registration_date || item.created_at,
      sex: item.sex || item.gender,
      birthDate: item.birthDate || item.birth_date,
      fuente: 'evo-api'
    })
  },
  {
    path: '/api/v2/management/not-renewed',
    name: 'No renovados EVO',
    dataType: 'clientes',
    description: 'Clientes con membresía vencida o no renovada',
    dataPath: 'clients',
    pagination: { type: 'take-skip', limit: 100 },
    mapTo: (item) => ({
      uniqueId: String(item.id || item.idMember || item.member_id || ''),
      idMember: String(item.id || item.idMember || item.member_id || ''),
      clienteId: String(item.id || item.idMember || ''),
      nombre: item.name || `${item.firstName || item.first_name || ''} ${item.lastName || item.last_name || ''}`.trim(),
      name: item.name || `${item.firstName || ''} ${item.lastName || ''}`.trim(),
      email: item.email || null,
      telefono: item.cellPhone || item.cell_phone || item.phone,
      cellPhone: item.cellPhone || item.cell_phone,
      idBranch: item.idBranch || item.branch_id,
      empresa: item.branchName || item.branch_name,
      branchName: item.branchName || item.branch_name,
      active: false,
      estado: 'inactivo',
      status: 'inactivo',
      membershipStatus: 'expired',
      membershipEndDate: item.membershipEnd || item.membership_end || item.dueDate || item.due_date || item.lastDueDate,
      planName: item.plan || item.plan_name || item.lastPlan,
      registrationDate: item.registrationDate || item.registration_date || item.created_at,
      fuente: 'evo-api'
    })
  }
];

/**
 * Busca un mapeo predeterminado por path de endpoint
 */
function findEvoMapping(path) {
  return EVO_KNOWN_ENDPOINTS.find(m => 
    m.path === path || path?.includes(m.path.split('?')[0])
  ) || null;
}

/**
 * Aplica el mapeo de un endpoint EVO a un array de items raw
 */
function applyEvoMapping(mapping, rawItems) {
  if (!Array.isArray(rawItems)) return [];
  return rawItems.map(item => {
    try {
      return mapping.mapTo(item);
    } catch (e) {
      return null;
    }
  }).filter(Boolean);
}

/**
 * Retorna lista simplificada para mostrar en el frontend
 */
function getEvoEndpointSuggestions() {
  return EVO_KNOWN_ENDPOINTS.map(({ path, name, dataType, description }) => ({
    path, name, dataType, description
  }));
}

module.exports = { 
  EVO_KNOWN_ENDPOINTS, 
  findEvoMapping, 
  applyEvoMapping,
  getEvoEndpointSuggestions
};
