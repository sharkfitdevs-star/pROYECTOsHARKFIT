import moment from 'moment';
import { Prospectos } from '@/entities/Prospectos';
import { Agendamientos } from '@/entities/Agendamientos';
import { Ventas } from '@/entities/Ventas';
import { Clientes } from '@/entities/Clientes';
import { Sucursales } from '@/entities/Sucursales';
import { Staff } from '@/entities/Staff';
import { Planes_Servicios } from '@/entities/Planes_Servicios';
import { Ciclos_Retencion } from '@/entities/Ciclos_Retencion';
import { Seguimiento_Online } from '@/entities/Seguimiento_Online';
import { sincronizarClienteDesdeVenta } from '@/components/SyncClientesHelper';

/**
 * Normaliza un número de WhatsApp al formato +56XXXXXXXXX
 */
export function normalizarWhatsApp(whatsapp) {
  if (!whatsapp) return '';
  
  // Convertir a string y limpiar espacios, guiones, paréntesis
  let limpio = String(whatsapp).replace(/[\s\-\(\)]/g, '');
  
  // Quitar el + inicial si existe
  limpio = limpio.replace(/^\+/, '');
  
  // Si empieza con 56, dejarlo así
  if (limpio.startsWith('56')) {
    return '+' + limpio;
  }
  
  // Si empieza con 9, agregar 56
  if (limpio.startsWith('9')) {
    return '+56' + limpio;
  }
  
  // Si no tiene prefijo, asumir que es chileno y agregar +56
  return '+56' + limpio;
}

/**
 * Convierte un monto en formato string ($45.000) a número
 */
export function convertirMonto(monto) {
  if (!monto) return 0;
  
  // Convertir a string y quitar $, espacios y puntos
  const limpio = String(monto)
    .replace(/\$/g, '')
    .replace(/\s/g, '')
    .replace(/\./g, '');
  
  const numero = parseFloat(limpio);
  return isNaN(numero) ? 0 : numero;
}

/**
 * Normaliza una fecha al formato YYYY-MM-DD
 * Soporta formatos: DD/MM/YYYY, D/M/YYYY, YYYY-MM-DD, MM/DD/YYYY, etc.
 */
export function normalizarFecha(fecha) {
  if (!fecha) return null;
  
  // Si ya es un objeto Date válido
  if (fecha instanceof Date && !isNaN(fecha)) {
    return moment(fecha).format('YYYY-MM-DD');
  }

  // Lista de formatos soportados, priorizando el formato latino (DD/MM/YYYY)
  const formatos = [
    'DD/MM/YYYY', 'D/M/YYYY', 'DD-MM-YYYY', 'D-M-YYYY', 
    'YYYY-MM-DD', 'YYYY/MM/DD',
    'MM/DD/YYYY', 'M/D/YYYY' // Fallback para formato US
  ];
  
  const fechaMoment = moment(String(fecha).trim(), formatos, true);
  
  if (fechaMoment.isValid()) {
    return fechaMoment.format('YYYY-MM-DD');
  }
  
  // Intento flexible si strict falla
  const fechaMomentFlexible = moment(String(fecha).trim(), formatos, false);
  if (fechaMomentFlexible.isValid()) {
    return fechaMomentFlexible.format('YYYY-MM-DD');
  }
  
  return null;
}

/**
 * Valida si una fecha es válida
 */
export function validarFecha(fecha) {
  if (!fecha) return false;
  return !!normalizarFecha(fecha);
}

/**
 * Busca una sede por nombre (case insensitive, ignora espacios)
 */
export async function buscarSede(nombreSede, sedes) {
  if (!nombreSede) return null;
  
  const nombreNormalizado = nombreSede.toLowerCase().trim();
  return sedes.find(s => 
    s.nombre_sede.toLowerCase().trim() === nombreNormalizado
  );
}

/**
 * Busca un vendedor por nombre (case insensitive, ignora espacios)
 */
export async function buscarVendedor(nombreVendedor, vendedores) {
  if (!nombreVendedor) return null;
  
  const nombreNormalizado = nombreVendedor.toLowerCase().trim();
  return vendedores.find(v => 
    v.nombre.toLowerCase().trim() === nombreNormalizado
  );
}

/**
 * Busca un plan por nombre (case insensitive, ignora espacios)
 */
export async function buscarPlan(nombrePlan, planes) {
  if (!nombrePlan) return null;
  
  const nombreNormalizado = nombrePlan.toLowerCase().trim();
  return planes.find(p => 
    p.nombre_plan.toLowerCase().trim() === nombreNormalizado
  );
}

/**
 * Crea o actualiza un prospecto desde un registro de migración
 */
export async function crearOActualizarProspecto(registro, sede, vendedor) {
  const whatsappNormalizado = normalizarWhatsApp(registro.WhatsApp);
  
  // Buscar prospecto existente por WhatsApp
  const prospectosExistentes = await Prospectos.filter({ whatsapp: whatsappNormalizado });
  const prospectoExistente = prospectosExistentes[0];

  console.log("prospectoExistente", prospectoExistente);
  
  const datosProspecto = {
    nombre: registro['Nombre y Apellido'],
    whatsapp: whatsappNormalizado,
    fecha_ingreso: normalizarFecha(registro['Fecha de Ingreso']),
    sede: sede?.id,
    vendedor_asignado: vendedor?.id,
    tipo_invitacion: registro['Tipo de Invitación'] || 'Invitación',
    estado_pipeline: 'Compró (en sede)', // Ya compró
    fecha_visita: normalizarFecha(registro['Fecha de Visita'] || registro['Fecha de Visita + Hora']) || null
  };
  
  if (prospectoExistente) {
    // Actualizar prospecto existente
    await Prospectos.update(prospectoExistente.id, datosProspecto);
    return prospectoExistente.id;
  } else {
    // Crear nuevo prospecto
    const nuevoProspecto = await Prospectos.create(datosProspecto);
    return nuevoProspecto.id;
  }
}

/**
 * Crea un agendamiento desde un registro de migración
 * SOLO si hay datos válidos de visita Y si se solicita explícitamente
 */
export async function crearAgendamiento(registro, prospectoId, sede, registradoPor) {
  const fechaVisita = normalizarFecha(registro['Fecha de Visita'] || registro['Fecha de Visita + Hora']);
  const hora = registro.Hora || '10:00';
  
  // NO crear agendamiento si no hay fecha de visita o registrado_por
  if (!fechaVisita || !registradoPor) return null;
  
  const fechaHora = `${fechaVisita}T${hora}:00`;
  
  const datosAgendamiento = {
    prospecto_id: prospectoId,
    fecha_hora: fechaHora,
    tipo_visita: registro['Tipo de Invitación'] || 'Invitación',
    sede: sede?.id,
    resultado_asistencia: registro.Estado || 'Asistió',
    registrado_por: registradoPor,
    notas: `Migrado desde CSV - Fecha de compra: ${registro['Fecha de Compra'] || registro['Fecha de compra'] || 'N/A'}`
  };
  
  const agendamiento = await Agendamientos.create(datosAgendamiento);
  return agendamiento.id;
}

/**
 * Crea las ventas (Plan + Inscripción) desde un registro de migración
 */
export async function crearVentas(registro, prospectoId, sede, vendedor, plan) {
  const ventasCreadas = [];
  
  // Determinar tipo de venta
  const tipoVenta = registro['Tipo de Invitación'] === 'Venta online' ? 'Online' : 'En sede';
  
  // Convertir montos
  const montoPlan = convertirMonto(registro.Monto);
  const montoDescuento = convertirMonto(registro.Descuento);
  const montoInscripcion = convertirMonto(registro.Inscripción);
  
  // Normalizar fecha
  const fechaCompra = normalizarFecha(registro['Fecha de Compra'] || registro['Fecha de compra']);

  // Determinar si el plan es Programa o Plan
  const esPrograma = plan?.tipo_item === 'Programa';
  
  // VENTA 1: Plan o Programa
  const descuentoPlan = esPrograma ? montoDescuento : 0;
  const venta1 = await Ventas.create({
    prospecto_id: prospectoId,
    prospecto_nombre: registro['Nombre y Apellido'],
    tipo_venta: tipoVenta,
    fecha_venta: fechaCompra,
    vendedor: vendedor?.id,
    sede: sede?.id,
    monto: montoPlan,
    plan: plan?.id,
    descuento: descuentoPlan,
    estado: 'Cerrada',
    notas: `Migrado desde CSV - ${plan?.nombre_plan || 'Plan'}`
  });
  ventasCreadas.push(venta1);
  
  // VENTA 2: Inscripción (solo si hay monto)
  if (montoInscripcion > 0) {
    // Buscar el servicio "Inscripción"
    const planes = await Planes_Servicios.filter({ activo: true });
    let servicioInscripcion = planes.find(p => 
      p.nombre_plan.toLowerCase().includes('inscripción') ||
      p.nombre_plan.toLowerCase().includes('inscripcion')
    );
    
    // Si no existe, crear el servicio Inscripción
    if (!servicioInscripcion) {
      servicioInscripcion = await Planes_Servicios.create({
        nombre_plan: 'Inscripción',
        tipo_item: 'Servicio',
        activo: true
      });
    }
    
    const descuentoInscripcion = esPrograma ? 0 : montoDescuento;
    const venta2 = await Ventas.create({
      prospecto_id: prospectoId,
      prospecto_nombre: registro['Nombre y Apellido'],
      tipo_venta: tipoVenta,
      fecha_venta: fechaCompra,
      vendedor: vendedor?.id,
      sede: sede?.id,
      monto: montoInscripcion,
      plan: servicioInscripcion.id,
      descuento: descuentoInscripcion,
      estado: 'Cerrada',
      notas: 'Migrado desde CSV - Inscripción'
    });
    ventasCreadas.push(venta2);
  }
  
  return ventasCreadas;
}

/**
 * Sincroniza el cliente en el módulo de retención
 */
export async function sincronizarCliente(venta, prospecto) {
  try {
    // La venta debe estar en estado "Cerrada" para sincronizar
    const ventaConEstado = { ...venta, estado: 'Cerrada' };
    const resultado = await sincronizarClienteDesdeVenta(ventaConEstado, prospecto);
    return resultado !== null;
  } catch (error) {
    console.error('Error sincronizando cliente:', error);
    return false;
  }
}

/**
 * Procesa un registro completo de migración (Clientes/Ventas)
 * NO crea agendamientos automáticamente para evitar errores de validación
 */
export async function procesarRegistroMigracion(registro, catalogos) {
  const resultado = {
    exito: false,
    prospectoId: null,
    agendamientoId: null,
    ventasIds: [],
    clienteSincronizado: false,
    errores: []
  };
  
  try {
    // 1. Buscar sede
    const sede = await buscarSede(registro.Sede, catalogos.sedes);
    if (!sede) {
      resultado.errores.push('Sede no encontrada');
      return resultado;
    }
    
    // 2. Buscar o crear vendedor
    let vendedor = await buscarVendedor(registro.Vendedor, catalogos.vendedores);
    if (!vendedor && registro.Vendedor) {
      // Crear vendedor automáticamente
      vendedor = await Staff.create({
        nombre: registro.Vendedor,
        email: `${registro.Vendedor.toLowerCase().replace(/\s/g, '')}@temp.com`,
        sede_principal: sede.id,
        roles: ['vendedor'],
        activo: true
      });
    }
    
    // 3. Buscar plan
    const plan = await buscarPlan(registro.Plan, catalogos.planes);
    if (!plan) {
      resultado.errores.push('Plan no encontrado');
      return resultado;
    }
    
    // 4. Crear/actualizar prospecto
    const prospectoId = await crearOActualizarProspecto(registro, sede, vendedor);

    console.log("prospectoId", prospectoId);
    resultado.prospectoId = prospectoId;
    
    // 5. NO crear agendamiento para importación de clientes/ventas
    // Los agendamientos solo se crean al importar prospectos con datos de visita válidos
    resultado.agendamientoId = null;
    
    // 6. Crear ventas
    const ventas = await crearVentas(registro, prospectoId, sede, vendedor, plan);
    resultado.ventasIds = ventas.map(v => v.id);
    
    // 7. Sincronizar cliente (usar la primera venta del plan)
    if (ventas.length > 0) {
      // Obtener el prospecto completo
      const prospecto = await Prospectos.get(prospectoId);
      const clienteSincronizado = await sincronizarCliente(ventas[0], prospecto);
      resultado.clienteSincronizado = clienteSincronizado;
    }
    
    resultado.exito = true;
  } catch (error) {
    console.error('Error procesando registro:', error);
    resultado.errores.push(error.message);
  }
  
  return resultado;
}

/**
 * Valida un registro antes de la migración
 */
export async function validarRegistro(registro, catalogos) {
  const errores = [];
  const advertencias = [];
  
  // Validaciones críticas
  if (!registro['Nombre y Apellido']?.trim()) {
    errores.push('Nombre y Apellido es obligatorio');
  }
  
  if (!registro.WhatsApp?.trim()) {
    errores.push('WhatsApp es obligatorio');
  }
  
  if (!registro['Fecha de Ingreso'] || !validarFecha(registro['Fecha de Ingreso'])) {
    errores.push('Fecha de Ingreso inválida');
  }
  
  const fechaCompraVal = registro['Fecha de Compra'] || registro['Fecha de compra'];
  if (!fechaCompraVal || !validarFecha(fechaCompraVal)) {
    errores.push('Fecha de Compra inválida');
  }
  
  if (!registro.Sede?.trim()) {
    errores.push('Sede es obligatoria');
  } else {
    const sede = await buscarSede(registro.Sede, catalogos.sedes);
    if (!sede) {
      errores.push(`Sede "${registro.Sede}" no existe en el sistema`);
    }
  }
  
  if (!registro.Plan?.trim()) {
    errores.push('Plan es obligatorio');
  } else {
    const plan = await buscarPlan(registro.Plan, catalogos.planes);
    if (!plan) {
      errores.push(`Plan "${registro.Plan}" no existe en el sistema`);
    }
  }
  
  const monto = convertirMonto(registro.Monto);
  if (monto <= 0) {
    errores.push('Monto debe ser mayor a 0');
  }
  
  // Advertencias
  if (registro.Vendedor?.trim()) {
    const vendedor = await buscarVendedor(registro.Vendedor, catalogos.vendedores);
    if (!vendedor) {
      advertencias.push(`Vendedor "${registro.Vendedor}" no existe, se creará automáticamente`);
    }
  } else {
    // Vendedor es opcional, no es advertencia
  }
  
  const whatsappNormalizado = normalizarWhatsApp(registro.WhatsApp);
  if (whatsappNormalizado !== registro.WhatsApp) {
    advertencias.push(`WhatsApp se normalizará a: ${whatsappNormalizado}`);
  }
  
  // Verificar si el prospecto ya existe
  const prospectosExistentes = await Prospectos.filter({ whatsapp: whatsappNormalizado });
  if (prospectosExistentes.length > 0) {
    advertencias.push(`WhatsApp ya existe en el sistema, se actualizará el prospecto`);
  }
  
  const fechaVisitaRaw = registro['Fecha de Visita'] || registro['Fecha de Visita + Hora'];
  if (fechaVisitaRaw && validarFecha(fechaVisitaRaw)) {
    const fechaVisita = new Date(normalizarFecha(fechaVisitaRaw));
    const fechaCompraRaw = registro['Fecha de Compra'] || registro['Fecha de compra'];
    const fechaCompra = new Date(normalizarFecha(fechaCompraRaw));
    if (fechaCompra < fechaVisita) {
      advertencias.push('Fecha de Compra es anterior a Fecha de Visita');
    }
  }
  
  const descuento = convertirMonto(registro.Descuento);
  if (descuento > monto) {
    advertencias.push('Descuento es mayor al monto del plan');
  }
  
  return {
    valido: errores.length === 0,
    errores,
    advertencias
  };
}

/**
 * Normaliza el estado_pipeline a valores válidos del schema
 */
export function normalizarEstadoPipeline(estado) {
  if (!estado) return 'Agendado'; // Valor por defecto
  
  const estadoLower = estado.toString().trim().toLowerCase();
  
  // Mapeo de valores comunes
  const mapeo = {
    'nuevo': 'Agendado',
    'agendado': 'Agendado',
    'asistio': 'Asistió',
    'asistió': 'Asistió',
    'no asistio': 'No asistió',
    'no asistió': 'No asistió',
    'reagendado': 'Reagendado',
    'compro en sede': 'Compró (en sede)',
    'compró en sede': 'Compró (en sede)',
    'compro (en sede)': 'Compró (en sede)',
    'compró (en sede)': 'Compró (en sede)',
    'compro online': 'Compró (online)',
    'compró online': 'Compró (online)',
    'compro (online)': 'Compró (online)',
    'compró (online)': 'Compró (online)',
    'no compro': 'No compró',
    'no compró': 'No compró',
    'perdido': 'Perdido',
    'no califica': 'No califica'
  };
  
  return mapeo[estadoLower] || 'Agendado';
}

/**
 * Valida un registro de prospecto simple (sin ventas)
 */
export async function validarRegistroProspecto(registro, catalogos) {
  const errores = [];
  const advertencias = [];
  
  console.log('    🔍 Validando registro:', {
    nombre: registro['Nombre y Apellido'],
    whatsapp: registro.WhatsApp,
    fecha: registro['Fecha de Ingreso'],
    sede: registro.Sede
  });
  
  // Validaciones críticas
  if (!registro['Nombre y Apellido']?.trim()) {
    errores.push('Nombre y Apellido es obligatorio');
  }
  
  if (!registro.WhatsApp?.trim()) {
    errores.push('WhatsApp es obligatorio');
  }
  
  if (!registro['Fecha de Ingreso']) {
    errores.push('Fecha de Ingreso es obligatoria');
  } else if (!validarFecha(registro['Fecha de Ingreso'])) {
    errores.push(`Fecha de Ingreso inválida: "${registro['Fecha de Ingreso']}"`);
  }
  
  if (!registro.Sede?.trim()) {
    errores.push('Sede es obligatoria');
  } else {
    console.log('    🏢 Buscando sede:', registro.Sede);
    console.log('    📋 Sedes disponibles:', catalogos.sedes.map(s => s.nombre_sede));
    const sede = await buscarSede(registro.Sede, catalogos.sedes);
    if (!sede) {
      errores.push(`Sede "${registro.Sede}" no existe. Sedes disponibles: ${catalogos.sedes.map(s => s.nombre_sede).join(', ')}`);
    } else {
      console.log('    ✓ Sede encontrada:', sede.nombre_sede);
    }
  }
  
  // Validación de duplicados: rechazar si ya existe un prospecto con el mismo nombre Y whatsapp
  if (registro.WhatsApp?.trim() && registro['Nombre y Apellido']?.trim()) {
    const whatsappNormalizado = normalizarWhatsApp(registro.WhatsApp);
    const nombreNormalizado = registro['Nombre y Apellido'].toLowerCase().trim();
    
    console.log('    🔍 Verificando duplicados...');
    const prospectosExistentes = await Prospectos.filter({ whatsapp: whatsappNormalizado });
    
    if (prospectosExistentes.length > 0) {
      // Verificar si alguno tiene el mismo nombre
      const duplicadoExacto = prospectosExistentes.find(p => 
        p.nombre.toLowerCase().trim() === nombreNormalizado
      );
      
      if (duplicadoExacto) {
        errores.push(`Ya existe un prospecto con el mismo nombre "${registro['Nombre y Apellido']}" y WhatsApp "${whatsappNormalizado}". No se permiten duplicados.`);
        console.log('    ❌ Duplicado detectado:', duplicadoExacto.nombre);
      }
    }
  }
  
  // Advertencias
  if (registro.Vendedor?.trim()) {
    console.log('    👤 Buscando vendedor:', registro.Vendedor);
    const vendedor = await buscarVendedor(registro.Vendedor, catalogos.vendedores);
    if (!vendedor) {
      advertencias.push(`Vendedor "${registro.Vendedor}" no existe, se creará automáticamente`);
    } else {
      console.log('    ✓ Vendedor encontrado:', vendedor.nombre);
    }
  }
  
  if (registro.WhatsApp?.trim()) {
    const whatsappNormalizado = normalizarWhatsApp(registro.WhatsApp);
    if (whatsappNormalizado !== registro.WhatsApp) {
      advertencias.push(`WhatsApp se normalizará de "${registro.WhatsApp}" a "${whatsappNormalizado}"`);
    }
  }
  
  const fechaVisitaRaw = registro['Fecha de Visita'] || registro['Fecha de Visita + Hora'];
  if (fechaVisitaRaw && !validarFecha(fechaVisitaRaw)) {
    advertencias.push(`Fecha de Visita inválida: "${fechaVisitaRaw}", se omitirá`);
  }
  
  console.log('    📊 Resultado validación:', {
    valido: errores.length === 0,
    errores,
    advertencias
  });
  
  return {
    valido: errores.length === 0,
    errores,
    advertencias
  };
}

/**
 * Procesa un registro de prospecto simple (sin ventas ni agendamientos)
 */
export async function procesarRegistroProspecto(registro, catalogos) {
  const resultado = {
    exito: false,
    prospectoId: null,
    agendamientoId: null,
    errores: []
  };
  
  try {
    console.log('    🔧 Procesando prospecto:', registro['Nombre y Apellido']);
    
    // 1. Buscar sede
    console.log('    🏢 Buscando sede:', registro.Sede);
    const sede = await buscarSede(registro.Sede, catalogos.sedes);
    if (!sede) {
      const error = `Sede "${registro.Sede}" no encontrada`;
      console.log('    ❌', error);
      resultado.errores.push(error);
      return resultado;
    }
    console.log('    ✓ Sede encontrada:', sede.nombre_sede, '(ID:', sede.id, ')');
    
    // 2. Buscar o crear vendedor (OPCIONAL)
    let vendedor = null;
    if (registro.Vendedor?.trim()) {
      console.log('    👤 Buscando vendedor:', registro.Vendedor);
      vendedor = await buscarVendedor(registro.Vendedor, catalogos.vendedores);
      
      if (!vendedor) {
        console.log('    ⚠️ Vendedor no encontrado, creando...');
        try {
          vendedor = await Staff.create({
            nombre: registro.Vendedor,
            email: `${registro.Vendedor.toLowerCase().replace(/\s/g, '').replace(/[^a-z0-9]/g, '')}@temp.com`,
            sede_principal: sede.id,
            roles: ['vendedor'],
            activo: true
          });
          console.log('    ✓ Vendedor creado:', vendedor.nombre, '(ID:', vendedor.id, ')');
        } catch (error) {
          console.log('    ⚠️ Error creando vendedor:', error.message);
          // No es crítico, continuar sin vendedor
        }
      } else {
        console.log('    ✓ Vendedor encontrado:', vendedor.nombre, '(ID:', vendedor.id, ')');
      }
    } else {
      console.log('    ℹ️ Sin vendedor asignado (opcional)');
    }
    
    // 3. Normalizar WhatsApp
    const whatsappNormalizado = normalizarWhatsApp(registro.WhatsApp);
    console.log('    📱 WhatsApp normalizado:', whatsappNormalizado);
    
    // 4. Buscar prospecto existente
    console.log('    🔍 Buscando prospecto existente...');
    const prospectosExistentes = await Prospectos.filter({ whatsapp: whatsappNormalizado });
    const prospectoExistente = prospectosExistentes[0];
    console.log('    ✓ Prospecto existente:', prospectoExistente ? 'Sí (ID: ' + prospectoExistente.id + ')' : 'No');
    
    // 4.1 Verificar duplicado exacto (mismo nombre Y whatsapp)
    if (prospectoExistente) {
      const nombreNormalizado = registro['Nombre y Apellido'].toLowerCase().trim();
      const nombreExistenteNormalizado = prospectoExistente.nombre.toLowerCase().trim();
      
      if (nombreExistenteNormalizado === nombreNormalizado) {
        const error = `Ya existe un prospecto con el mismo nombre "${registro['Nombre y Apellido']}" y WhatsApp "${whatsappNormalizado}". No se permiten duplicados.`;
        console.log('    ❌', error);
        resultado.errores.push(error);
        return resultado;
      }
    }
    
    // 5. Normalizar estado_pipeline (puede venir como 'Estado' o 'Estado Pipeline')
    const estadoOriginal = registro['Estado'] || registro['Estado Pipeline'];
    const estadoPipeline = normalizarEstadoPipeline(estadoOriginal);
    console.log('    📊 Estado pipeline normalizado:', {
      original: estadoOriginal,
      normalizado: estadoPipeline
    });
    
    // 6. Preparar datos del prospecto
    const datosProspecto = {
      nombre: registro['Nombre y Apellido'],
      whatsapp: whatsappNormalizado,
      fecha_ingreso: normalizarFecha(registro['Fecha de Ingreso']),
      sede: sede.id,
      tipo_invitacion: registro['Tipo de Invitación'] || 'Invitación',
      estado_pipeline: estadoPipeline,
      notas: registro.Notas || ''
    };
    
    // Agregar vendedor si existe
    if (vendedor) {
      datosProspecto.vendedor_asignado = vendedor.id;
    }
    
    // Agregar fecha_visita si existe y es válida
    const fechaVisitaRaw = registro['Fecha de Visita'] || registro['Fecha de Visita + Hora'];
    if (fechaVisitaRaw && validarFecha(fechaVisitaRaw)) {
      datosProspecto.fecha_visita = normalizarFecha(fechaVisitaRaw);
      console.log('    📅 Fecha de visita:', datosProspecto.fecha_visita);
    }
    
    console.log('    📝 Datos a guardar:', datosProspecto);
    
    // 7. Crear o actualizar prospecto
    if (prospectoExistente) {
      console.log('    🔄 Actualizando prospecto existente...');
      await Prospectos.update(prospectoExistente.id, datosProspecto);
      resultado.prospectoId = prospectoExistente.id;
      console.log('    ✅ Prospecto actualizado (ID:', resultado.prospectoId, ')');
    } else {
      console.log('    ➕ Creando nuevo prospecto...');
      const nuevoProspecto = await Prospectos.create(datosProspecto);
      resultado.prospectoId = nuevoProspecto.id;
      console.log('    ✅ Prospecto creado (ID:', resultado.prospectoId, ')');
    }
    
    // 8. Crear agendamiento si hay fecha_visita válida
    if (datosProspecto.fecha_visita) {
      console.log('    📅 Creando agendamiento automático...');
      
      try {
        // Determinar registrado_por (usar vendedor si existe, sino usar el primer staff activo)
        let registradoPor = vendedor?.id;
        if (!registradoPor) {
          console.log('    ⚠️ Sin vendedor, buscando staff activo para registrado_por...');
          const staffActivo = catalogos.vendedores.find(s => s.activo);
          if (staffActivo) {
            registradoPor = staffActivo.id;
            console.log('    ✓ Usando staff:', staffActivo.nombre, '(ID:', registradoPor, ')');
          }
        }
        
        if (registradoPor) {
          const fechaHora = `${datosProspecto.fecha_visita}T10:00:00`;
          
          const datosAgendamiento = {
            prospecto_id: resultado.prospectoId,
            prospecto_nombre: datosProspecto.nombre,
            fecha_hora: fechaHora,
            tipo_visita: datosProspecto.tipo_invitacion || 'Invitación',
            sede: sede.id,
            resultado_asistencia: 'Pendiente',
            registrado_por: registradoPor,
            notas: `Agendamiento creado automáticamente desde importación CSV`
          };
          
          console.log('    📝 Datos agendamiento:', datosAgendamiento);
          
          const agendamiento = await Agendamientos.create(datosAgendamiento);
          resultado.agendamientoId = agendamiento.id;
          console.log('    ✅ Agendamiento creado (ID:', resultado.agendamientoId, ')');
        } else {
          console.log('    ⚠️ No se pudo crear agendamiento: sin staff disponible para registrado_por');
        }
      } catch (error) {
        console.error('    ⚠️ Error creando agendamiento:', error.message);
        // No es crítico, continuar sin agendamiento
      }
    } else {
      console.log('    ℹ️ Sin fecha de visita válida, no se crea agendamiento');
    }
    
    resultado.exito = true;
  } catch (error) {
    console.error('    ❌ Error procesando prospecto:', error);
    resultado.errores.push(error.message || 'Error desconocido');
  }
  
  return resultado;
}

/**
 * Valida un registro de cliente activo antes de la migración
 */
export async function validarRegistroClienteActivo(registro, catalogos) {
  const errores = [];
  const advertencias = [];
  
  // Validaciones críticas
  if (!registro['Nombre y Apellido']?.trim()) {
    errores.push('Nombre y Apellido es obligatorio');
  }
  
  if (!registro.WhatsApp?.trim()) {
    errores.push('WhatsApp es obligatorio');
  }
  
  if (!registro.Sede?.trim()) {
    errores.push('Sede es obligatoria');
  } else {
    const sede = await buscarSede(registro.Sede, catalogos.sedes);
    if (!sede) {
      errores.push(`Sede "${registro.Sede}" no existe. Sedes disponibles: ${catalogos.sedes.map(s => s.nombre_sede).join(', ')}`);
    }
  }
  
  // Fecha de conversión (primer plan) - obligatoria
  if (!registro['Fecha de Conversion'] && !registro['Fecha Conversion'] && !registro['Fecha de Primer Plan']) {
    errores.push('Fecha de Conversión (Primer Plan) es obligatoria');
  } else {
    const fechaConversion = registro['Fecha de Conversion'] || registro['Fecha Conversion'] || registro['Fecha de Primer Plan'];
    if (!validarFecha(fechaConversion)) {
      errores.push(`Fecha de Conversión inválida: "${fechaConversion}"`);
    }
  }
  
  // Fecha de renovación este mes - obligatoria
  if (!registro['Fecha de Renovacion'] && !registro['Fecha Renovacion'] && !registro['Fecha de Renovación']) {
    errores.push('Fecha de Renovación es obligatoria');
  } else {
    const fechaRenovacion = registro['Fecha de Renovacion'] || registro['Fecha Renovacion'] || registro['Fecha de Renovación'];
    if (!validarFecha(fechaRenovacion)) {
      errores.push(`Fecha de Renovación inválida: "${fechaRenovacion}"`);
    }
  }
  
  // Plan - obligatorio
  if (!registro.Plan?.trim()) {
    errores.push('Plan es obligatorio');
  } else {
    const plan = await buscarPlan(registro.Plan, catalogos.planes);
    if (!plan) {
      errores.push(`Plan "${registro.Plan}" no existe en el sistema`);
    }
  }
  
  // Verificar duplicados por WhatsApp
  if (registro.WhatsApp?.trim()) {
    const whatsappNormalizado = normalizarWhatsApp(registro.WhatsApp);
    const clientesExistentes = await Clientes.filter({ whatsapp: whatsappNormalizado });
    
    if (clientesExistentes.length > 0) {
      errores.push(`Ya existe un cliente con el WhatsApp "${whatsappNormalizado}". No se permiten duplicados.`);
    }
  }
  
  // Validar campo Deudor
  const esDeudor = registro.Deudor || registro['Es Deudor'];
  if (esDeudor && !['Si', 'Sí', 'No', 'SI', 'NO', 'si', 'no', 'sí', 'true', 'false', '1', '0'].includes(esDeudor?.toString().trim())) {
    advertencias.push(`Valor de Deudor no reconocido: "${esDeudor}". Se interpretará como "No".`);
  }
  
  // Advertencias
  const whatsappNormalizado = normalizarWhatsApp(registro.WhatsApp);
  if (whatsappNormalizado !== registro.WhatsApp && registro.WhatsApp) {
    advertencias.push(`WhatsApp se normalizará de "${registro.WhatsApp}" a "${whatsappNormalizado}"`);
  }
  
  return {
    valido: errores.length === 0,
    errores,
    advertencias
  };
}

/**
 * Procesa un registro de cliente activo (crea Cliente + Venta de renovación)
 */
export async function procesarRegistroClienteActivo(registro, catalogos) {
  const resultado = {
    exito: false,
    clienteId: null,
    ventaId: null,
    cicloRetencionId: null,
    errores: []
  };
  
  try {
    // 1. Buscar sede
    const sede = await buscarSede(registro.Sede, catalogos.sedes);
    if (!sede) {
      resultado.errores.push(`Sede "${registro.Sede}" no encontrada`);
      return resultado;
    }
    
    // 2. Buscar plan
    const plan = await buscarPlan(registro.Plan, catalogos.planes);
    if (!plan) {
      resultado.errores.push(`Plan "${registro.Plan}" no encontrado`);
      return resultado;
    }
    
    // 3. Normalizar datos
    const whatsappNormalizado = normalizarWhatsApp(registro.WhatsApp);
    const fechaConversion = normalizarFecha(registro['Fecha de Conversion'] || registro['Fecha Conversion'] || registro['Fecha de Primer Plan']);
    const fechaRenovacion = normalizarFecha(registro['Fecha de Renovacion'] || registro['Fecha Renovacion'] || registro['Fecha de Renovación']);
    
    // 4. Determinar si es deudor
    const esDeudorRaw = registro.Deudor || registro['Es Deudor'] || 'No';
    const esDeudor = ['Si', 'Sí', 'SI', 'si', 'sí', 'true', '1'].includes(esDeudorRaw?.toString().trim());
    
    // 5. Verificar duplicado
    const clientesExistentes = await Clientes.filter({ whatsapp: whatsappNormalizado });
    if (clientesExistentes.length > 0) {
      resultado.errores.push(`Ya existe un cliente con WhatsApp "${whatsappNormalizado}"`);
      return resultado;
    }
    
    // 6. Calcular fecha fin del plan (basado en la renovación + duración del plan)
    const duracionMeses = plan.duracion_meses || 1;
    const fechaFinPlan = moment(fechaRenovacion).add(duracionMeses, 'months').format('YYYY-MM-DD');
    
    // 7. Buscar vendedor si existe
    let vendedorId = null;
    if (registro.Vendedor?.trim()) {
      const vendedor = await buscarVendedor(registro.Vendedor, catalogos.vendedores);
      if (vendedor) {
        vendedorId = vendedor.id;
      }
    }
    
    // 8. Crear cliente
    const datosCliente = {
      nombre_cliente: registro['Nombre y Apellido'],
      whatsapp: whatsappNormalizado,
      sede: sede.id,
      fecha_primer_compra: fechaConversion,
      plan_actual: plan.id,
      modalidad_actual: plan.modalidad_cobro || plan.modalidad || 'Suscripción',
      duracion_actual_meses: duracionMeses,
      fecha_inicio_plan_actual: fechaRenovacion,
      fecha_fin_plan_actual: fechaFinPlan,
      estado_suscripcion: esDeudor ? 'Deudor' : 'Activo',
      activo: true,
      notas: `Migrado desde CSV - Fecha conversión: ${fechaConversion}`
    };
    
    if (vendedorId) {
      datosCliente.vendedor_origen = vendedorId;
    }
    
    const cliente = await Clientes.create(datosCliente);
    resultado.clienteId = cliente.id;
    
    // 9. Crear venta de renovación
    const monto = convertirMonto(registro.Monto || '0');
    
    const datosVenta = {
      prospecto_nombre: registro['Nombre y Apellido'],
      tipo_venta: 'En sede',
      fecha_venta: fechaRenovacion,
      sede: sede.id,
      monto: monto,
      plan: plan.id,
      descuento: 0,
      estado: 'Cerrada',
      es_renovacion: true,
      cliente_id: cliente.id,
      notas: `Renovación migrada desde CSV - Cliente activo del mes`
    };
    
    if (vendedorId) {
      datosVenta.vendedor = vendedorId;
    }
    
    const venta = await Ventas.create(datosVenta);
    resultado.ventaId = venta.id;
    
    // 10. Crear registro en Ciclos_Retencion (evento de renovación)
    try {
      const ciclo = await Ciclos_Retencion.create({
        cliente: cliente.id,
        sede: sede.id,
        fecha_evento: fechaRenovacion,
        tipo_evento: 'Renovó',
        plan: plan.id,
        monto: monto,
        dias_desde_ultimo_pago: 0,
        nota: `Renovación migrada desde CSV - Cliente activo del mes`
      });
      resultado.cicloRetencionId = ciclo.id;
    } catch (error) {
      console.error('Error creando ciclo de retención:', error);
      // No es crítico, continuar
    }
    
    // 11. Verificar si el cliente está vencido y crear Seguimiento_Online
    const hoy = moment();
    const fechaFin = moment(fechaFinPlan);
    const estaVencido = hoy.isAfter(fechaFin);
    
    if (estaVencido) {
      try {
        // Verificar si ya existe un seguimiento activo
        const seguimientosExistentes = await Seguimiento_Online.filter({
          cliente_id: cliente.id,
          estado: 'Seguimiento Online'
        });
        
        if (seguimientosExistentes.length === 0) {
          // Asignar responsable según sede
          const sedesYeimar = ['Nogales', 'Colón', 'Cisterna'];
          const sedesElsimar = ['Buín', 'Santiago Centro', 'Bosque', 'Sh Pro Bosque'];
          
          let nombreResponsable = null;
          if (sedesYeimar.includes(sede.nombre_sede)) {
            nombreResponsable = 'Yeimar Barona';
          } else if (sedesElsimar.includes(sede.nombre_sede)) {
            nombreResponsable = 'Elsimar';
          }
          
          let responsable = null;
          if (nombreResponsable) {
            const staffList = catalogos.vendedores.filter(s => 
              s.nombre === nombreResponsable && s.activo
            );
            responsable = staffList[0] || null;
          }
          
          const diasVencido = hoy.diff(fechaFin, 'days');
          
          await Seguimiento_Online.create({
            cliente_id: cliente.id,
            cliente_nombre: cliente.nombre_cliente,
            cliente_whatsapp: cliente.whatsapp,
            fecha_vencimiento: fechaFinPlan,
            sede: sede.id,
            responsable_seguimiento_id: responsable?.id || null,
            responsable_seguimiento_nombre: responsable?.nombre || null,
            estado: 'Seguimiento Online',
            dias_vencido: diasVencido > 0 ? diasVencido : 0,
            fue_contactado: false,
            renovo: false
          });
        }
      } catch (error) {
        console.error('Error creando seguimiento online:', error);
        // No es crítico, continuar
      }
    }
    
    resultado.exito = true;
  } catch (error) {
    console.error('Error procesando cliente activo:', error);
    resultado.errores.push(error.message || 'Error desconocido');
  }
  
  return resultado;
}