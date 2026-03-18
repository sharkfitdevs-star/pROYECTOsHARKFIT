const removeDiacritics = (str) =>
  str.normalize('NFD').replace(/\p{Diacritic}/gu, '');

function normalizeHeader(str) {
  if (str === undefined || str === null) return '';
  let s = String(str);
  s = s.trim().toLowerCase();
  s = removeDiacritics(s);
  s = s.replace(/[\s\-]+/g, '_');
  s = s.replace(/[^a-z0-9_]/g, '');
  return s;
}

// ─────────────────────────────────────────────────────────────────────────────
// SYNONYMS: valores ya normalizados con normalizeHeader()
// Columnas EXACTAS del Excel del cliente (y su forma normalizada):
//   "Nombre y Apellido"          → nombre_y_apellido
//   "WhatsApp"                   → whatsapp
//   "Fecha de Ingreso"           → fecha_de_ingreso
//   "Fecha de Visita + Hora"     → fecha_de_visita__hora   (doble __)
//   "Tipo de Invitación"         → tipo_de_invitacion
//   "Estado (Asistió/No asistió)"→ estado_asistiono_asistio
//   "Vendedor"                   → vendedor
//   "Fecha de Compra"            → fecha_de_compra
//   "Plan"                       → plan
//   "Monto"                      → monto
//   "Descuento"                  → descuento
//   "Inscripción"                → inscripcion
//   "Sede"                       → sede
// ─────────────────────────────────────────────────────────────────────────────
const SYNONYMS = {
  // ── CLIENTES ──────────────────────────────────────────────────────────────
  name:         ['nombre', 'nombres', 'firstname', 'givenname', 'name'],
  lastName:     ['apellido', 'apellidos', 'lastname', 'surname'],
  email:        ['email', 'correo', 'mail', 'e_mail', 'correo_electronico'],
  cellPhone:    ['telefono', 'celular', 'movil', 'mobile', 'phone', 'fono', 'tel', 'whatsapp', 'wsp'],
  idMember:     ['id_miembro', 'idmember', 'member_id', 'socio_id', 'id_socio', 'rut', 'dni', 'documento'],

  // ── VENTAS ────────────────────────────────────────────────────────────────
  // "Nombre y Apellido" → nombre_y_apellido
  memberName:   [
    'nombre_y_apellido',      // ← columna exacta del Excel
    'nombre_completo',
    'cliente',
    'nombre_cliente',
    'member',
    'membername',
  ],

  // "WhatsApp" → whatsapp
  whatsapp:     [
    'whatsapp',               // ← columna exacta del Excel
    'wsp',
    'celular',
    'telefono',
  ],

  // "Fecha de Ingreso" → fecha_de_ingreso
  saleDate:     [
    'fecha_de_ingreso',       // ← columna exacta del Excel
    'fecha_ingreso',
    'fecha',
    'fecha_venta',
    'fecha_de_venta',
    'date',
    'saledate',
  ],

  // "Fecha de Visita + Hora" → fecha_de_visita__hora (doble __)
  dueDate:      [
    'fecha_de_visita__hora',  // ← columna exacta del Excel (doble __ por el +)
    'fecha_de_visita',
    'fecha_visita',
    'vencimiento',
    'fecha_vencimiento',
    'duedate',
  ],

  // "Tipo de Invitación" → tipo_de_invitacion
  saleType:     [
    'tipo_de_invitacion',     // ← columna exacta del Excel
    'tipo_invitacion',
    'tipo',
    'tipo_venta',
    'tipo_de_venta',
    'saletype',
  ],

  // "Estado (Asistió/No asistió)" → estado_asistiono_asistio
  paymentStatus:[
    'estado_asistiono_asistio', // ← columna exacta del Excel
    'estado',
    'estado_pago',
    'estado_de_pago',
    'paymentstatus',
    'estatus',
  ],

  // "Vendedor" → vendedor
  employeeName: [
    'vendedor',               // ← columna exacta del Excel
    'vendedora',
    'empleado',
    'asesor',
    'ejecutivo',
    'employeename',
  ],

  // "Fecha de Compra" → fecha_de_compra
  fechaCompra:  [
    'fecha_de_compra',        // ← columna exacta del Excel
    'fecha_compra',
  ],

  // "Plan" → plan
  planName:     [
    'plan',                   // ← columna exacta del Excel
    'nombre_plan',
    'planname',
    'producto',
  ],

  // "Monto" → monto
  amount:       [
    'monto',                  // ← columna exacta del Excel
    'valor',
    'precio',
    'amount',
    'importe',
  ],

  // "Descuento" → descuento
  discount:     [
    'descuento',              // ← columna exacta del Excel
    'dto',
    'discount',
  ],

  // "Inscripción" → inscripcion
  tax:          [
    'inscripcion',            // ← columna exacta del Excel
    'inscripcion',
    'impuesto',
    'iva',
    'tax',
  ],

  // "Sede" → sede
  branchName:   [
    'sede',                   // ← columna exacta del Excel
    'sucursal',
    'local',
    'branch',
    'branchname',
  ],

  // campos adicionales que pueden venir
  totalAmount:  ['total', 'monto_total', 'totalamount', 'valor_total'],
  idSale:       ['id_venta', 'idventa', 'saleid', 'id_sale'],
  idMemberVenta:['id_cliente', 'id_miembro', 'idmember'],
  notes:        ['notas', 'nota', 'notes', 'observaciones', 'comentarios'],
  paymentMethod:['metodo_pago', 'metodo_de_pago', 'forma_pago', 'paymentmethod'],
  installments: ['cuotas', 'installments', 'pagos'],
};

/**
 * Detecta el mapeo entre cabeceras del archivo y campos del schema.
 */
function detectMapping(headers = [], provided = {}, entidad = 'clientes') {
  const normalizedHeaders = headers.map((h) => normalizeHeader(h || ''));
  const warnings = [];

  // El frontend envía { 'ColumnaExcel': 'campoInterno' }
  // Construimos provNorm = { columnaExcelNorm: campoInterno }
  const provNorm = {};
  Object.entries(provided || {}).forEach(([k, v]) => {
    if (v) provNorm[normalizeHeader(String(k))] = v;
  });

  console.debug('[detectMapping] provNorm:', provNorm);
  console.debug('[detectMapping] normalizedHeaders:', normalizedHeaders);

  const mapping = {};
  headers.forEach((raw, idx) => {
    const nh = normalizedHeaders[idx];

    // 1. Mapping provisto por el usuario (prioridad)
    if (provNorm[nh]) {
      mapping[raw] = provNorm[nh];
      return;
    }

    // 2. Match directo: el header normalizado coincide con el nombre del campo
    if (SYNONYMS[nh] !== undefined) {
      mapping[raw] = nh;
      return;
    }

    // 3. Búsqueda en sinónimos
    for (const [field, syns] of Object.entries(SYNONYMS)) {
      if (syns.includes(nh)) {
        mapping[raw] = field;
        return;
      }
    }

    warnings.push(`sin mapeo para cabecera '${raw}' (normalizada: '${nh}')`);
  });

  console.debug('[detectMapping] mapping resultado:', mapping);
  console.debug('[detectMapping] warnings:', warnings);

  // Validación solo para clientes
  if (entidad === 'clientes') {
    const mapped = Object.values(mapping);
    const hasIdentifier = mapped.some(f =>
      ['name', 'email', 'cellPhone', 'cellphone', 'idMember', 'idmember'].includes(f)
    );
    if (!hasIdentifier) {
      throw new Error('No se detectaron columnas identificadoras (name/email/phone)');
    }
  }

  return { mapping, detectedHeaders: normalizedHeaders, warnings };
}

/**
 * Sugiere el mapeo desde las cabeceras usando sinónimos.
 */
function suggestMapping(headers = [], entidad = 'clientes') {
  const normalized = headers.map((h) => normalizeHeader(h || ''));
  const result = {};

  const fields = entidad === 'ventas'
    ? [
        'memberName', 'whatsapp', 'saleDate', 'dueDate', 'saleType',
        'paymentStatus', 'employeeName', 'fechaCompra', 'planName',
        'amount', 'discount', 'tax', 'branchName',
        'totalAmount', 'idSale', 'notes', 'paymentMethod',
      ]
    : ['name','lastName','email','cellPhone','idMember'];

  fields.forEach((field) => {
    result[field] = null;
    const syns = SYNONYMS[field] || [];
    normalized.forEach((nh, idx) => {
      if (result[field]) return; // ya encontrado
      if (nh === normalizeHeader(field) || syns.includes(nh)) {
        result[field] = headers[idx];
      }
    });
  });

  return result;
}

module.exports = { normalizeHeader, detectMapping, suggestMapping }
