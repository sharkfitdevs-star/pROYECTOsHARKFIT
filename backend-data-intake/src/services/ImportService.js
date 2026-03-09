/**
 * SERVICE: ImportService
 * Manejo de importaciones desde Excel y CSV
 */

const ExcelJS = require('exceljs');
const csv = require('csv-parser');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const _logger = require('../utils/logger');
const logger = {
  info:  (...a) => (_logger.info  ? _logger.info(...a)  : console.log(...a)),
  warn:  (...a) => (_logger.warn  ? _logger.warn(...a)  : console.warn(...a)),
  error: (...a) => (_logger.error ? _logger.error(...a) : console.error(...a)),
  debug: (...a) => (_logger.debug ? _logger.debug(...a) : console.debug(...a)),
};
const {
  findClienteByIdentifiers,
  upsertCliente,
  upsertVenta,
  createSyncLog,
  updateSyncLog,
  findClienteByEmail
} = require('../db/repositories');
const { normalizeHeader: importedNormalizeHeader, detectMapping } = require('../utils/importUtils');

// helper for normalizing headers/maps (also available via import but
// defined locally to guarantee consistency and allow in-file use):
function normalizeHeader(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // quita acentos
    .replace(/[^a-z0-9]+/g, '_')      // espacios y especiales → _
    .replace(/^_+|_+$/g, '');         // trim underscores
}

// start of ImportService class
class ImportService {
/**
   * @param {File} file - Archivo subido
   * @param {Object} mapeo - Mapeo de columnas { 'Nombre Excel': 'campo.schema' }
   * @param {String} entidad - 'clientes', 'ventas', 'leads'
   */
  async processExcelFile(file, mapeo, entidad = 'clientes', providedSyncId) {
    const syncId = providedSyncId || uuidv4();
    const fileMeta = {
      originalName: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
      ext: file.originalname ? file.originalname.split('.').pop() : null
    };
    const baseLog = await createSyncLog({
      syncId,
      entidad,
      fuente: 'Excel',
      estatus: 'Procesando',
      iniciado: new Date(),
      fileMeta
    });

    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(file.path);
      const worksheet = workbook.getWorksheet(1);

      // detect headers
      const headerRow = worksheet.getRow(1);
      const headers = [];
      headerRow.eachCell((cell) => headers.push(cell.value));

      // normalize headers (trim + lowercase)
      const headersNorm = headers.map(h => normalizeHeader(h || ''));
      console.debug('Headers normalizados:', headersNorm);

      // El frontend envía { "ColExcel": "campoInterno" }
      // Pasamos tal cual a detectMapping que ya normaliza internamente los values
      const mappingNormalized = {};
      if (mapeo && typeof mapeo === 'object') {
        Object.entries(mapeo).forEach(([k, v]) => {
          if (v) mappingNormalized[k] = v;
        });
      }
      console.debug('Mapping recibido del frontend:', JSON.stringify(mappingNormalized));
      // temporary debug: show headers and mapping after normalization is ready
      console.log('=== DEBUG IMPORT ===');
      console.log('Headers raw:', JSON.stringify(headers));
      console.log('Headers norm:', JSON.stringify(headersNorm));
      console.log('Mapping recibido:', JSON.stringify(mappingNormalized));
      console.log('===================\n');

      const { mapping: mappingUsed, detectedHeaders, warnings: mappingWarnings } = detectMapping(headers, mappingNormalized, entidad);
      // compute normalized version of mappingUsed so row processing can use it
      const mappingUsedNormalized = {};
      Object.entries(mappingUsed).forEach(([rawHeader, field]) => {
        const norm = normalizeHeader(rawHeader || '');
        mappingUsedNormalized[norm] = field;
      });
      // add warning if required field missing (name for clientes)
      if (entidad === 'clientes') {
        const mappedFields = Object.values(mappingUsed).map(f => normalizeHeader(f));
        if (!mappedFields.includes('name')) {
          mappingWarnings.push('missingFields:name');
        }
      }
      // store sheet name
      const sheetName = worksheet.name || null;

      const registros = [];
      const errores = [];
      const invalidRows = [];
      let procesados = 0;
      let inseridos = 0;
      let actualizados = 0;
      let skippedCount = 0;
      let invalidCount = 0;

      // Leer filas (ignorar encabezados)
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header

        procesados++;
        const objeto = {};
        // build object according to normalized mapping
        Object.entries(mappingUsedNormalized).forEach(([normHeader, field]) => {
          const colIndex = headersNorm.findIndex((h) => h === normHeader) + 1;
          if (colIndex > 0) {
            const valor = row.getCell(colIndex).value;
            console.log('MAPPING', { normHeader, field, valor });
            this._asignarValor(objeto, field, valor);
          }
        });
        console.log('OBJETO CONSTRUIDO:', JSON.stringify(objeto, null, 2));

        // validate required for clientes
        if (entidad === 'clientes') {
          console.debug('objeto construido en fila ' + rowNumber + ':', JSON.stringify(objeto));
          const hasId = objeto.name || objeto.email || objeto.phone ||
                        objeto.cellphone || objeto.cellPhone || objeto.idMember;
          if (!hasId) {
            invalidCount++;
            invalidRows.push({ fila: rowNumber, motivo: 'missing identity fields' });
            return; // skip inserting later
          }
        }

        registros.push(objeto);
      });

      // Procesar según entidad
      let fallidosDB = 0;
      if (entidad === 'clientes') {
        const resultado = await this._importarClientes(registros, syncId);
        inseridos = resultado.insertedCount;
        actualizados = resultado.updatedCount;
        fallidosDB = resultado.skippedCount || 0;
        invalidCount += resultado.invalidCount || 0;
      } else if (entidad === 'ventas') {
        const resultado = await this._importarVentas(registros, syncId);
        inseridos = resultado.inseridos;
        actualizados = resultado.actualizados;
        // ventas importer already handles its own errors but could be extended similarly
      } else if (entidad === 'leads') {
        const resultado = await this._importarLeads(registros, syncId);
        inseridos = resultado.inseridos;
        actualizados = resultado.actualizados;
      } else if (entidad === 'agendamientos') {
        const resultado = await this._importarAgendamientos(registros, syncId);
        inseridos = resultado.inseridos;
        actualizados = resultado.actualizados;
      }

      // Registrar en syncLog
      const finalizado = new Date();
      skippedCount = errores.length;
      const totalFallidos = skippedCount + fallidosDB + invalidCount;
      let estatusFinal = 'Exitoso';
      if (totalFallidos > 0 && (inseridos > 0 || actualizados > 0)) {
        estatusFinal = 'Parcial';
      } else if (totalFallidos > 0 && inseridos === 0 && actualizados === 0) {
        estatusFinal = 'Fallido';
      }

      await updateSyncLog(syncId, {
        entidad,
        estatus: estatusFinal,
        registosProcesados: procesados,
        registosInseridos: inseridos,
        registosActualizados: actualizados,
        registosFallidos: totalFallidos,
        totalRows: procesados,
        insertedCount: inseridos,
        updatedCount: actualizados,
        skippedCount: skippedCount,
        invalidCount: invalidCount,
        warnings: [...mappingWarnings, ...invalidRows.map(r=>r.motivo)],
        mappingUsed,
        detectedHeaders,
        sheetName,
        errores,
        finalizado,
        duracionMs: baseLog?.iniciado ? finalizado - new Date(baseLog.iniciado) : null,
        cambios: {
        clientesNuevos: entidad === 'clientes' ? inseridos : 0,
        clientesActualizados: entidad === 'clientes' ? actualizados : 0,
        ventasNuevas: entidad === 'ventas' ? inseridos : 0
        }
      });

      logger.info(`✅ Importación Excel completada: ${procesados} registros`, { syncId });

      return {
        syncId,
        totalRows: procesados,
        insertedCount: inseridos,
        skippedCount: skippedCount,
        invalidCount: invalidCount,
        mappingUsed,
        detectedHeaders,
        sheetName,
        warnings: mappingWarnings,
        registosProcesados: procesados,
        registosInseridos: inseridos,
        registosActualizados: actualizados,
        registosFallidos: totalFallidos,
        errores,
        estatus: estatusFinal
      };
    } catch (error) {
      logger.error('❌ Error en importación Excel:', error, { syncId });
      await updateSyncLog(syncId, {
        estatus: 'Fallido',
        errorMessage: error.message,
        errorStack: error.stack,
        finalizado: new Date()
      });

      throw error;
    } finally {
      // Limpiar archivo temporal
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    }
  }

  /**
   * Procesar archivo CSV
   */
  async processCSVFile(file, mapeo, entidad = 'clientes', delimitador = ',', providedSyncId) {
    const syncId = providedSyncId || uuidv4();
    const fileMeta = {
      originalName: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
      ext: file.originalname ? file.originalname.split('.').pop() : null
    };

    const baseLog = await createSyncLog({
      syncId,
      entidad,
      fuente: 'CSV',
      estatus: 'Procesando',
      iniciado: new Date(),
      fileMeta
    });

    return new Promise((resolve, reject) => {
      const registros = [];
      const errores = [];
      const invalidRows = [];
      let procesados = 0;
      let skippedCount = 0;
      let invalidCount = 0;
      let detectedHeaders = [];
      let rawHeaders = [];
      let mappingUsed = {};
      let mappingUsedNormalized = {};
      let mappingWarnings = [];

      const stream = fs.createReadStream(file.path)
        .pipe(csv({ separator: delimitador }))
        .on('data', (row) => {
          procesados++; // count every row read
          if (procesados === 1) {
            // first data row gives headers
            rawHeaders = Object.keys(row);
            detectedHeaders = rawHeaders.map((h) => normalizeHeader(h));
            console.debug('CSV headers normalizados:', detectedHeaders);

            // normalize provided mapping keys
            // El mapeo viene como { campoInterno: 'ColumnaExcel' }
            // detectMapping internamente invierte, pero necesita las values normalizadas
            const mappingNormalized = {};
            if (mapeo && typeof mapeo === 'object') {
              Object.entries(mapeo).forEach(([k, v]) => {
                if (v) mappingNormalized[k] = v;
              });
            }
            console.debug('CSV mapping normalizado:', mappingNormalized);

            const { mapping, warnings } = detectMapping(rawHeaders, mappingNormalized, entidad);
            mappingUsed = mapping;
            // build normalized version for row parsing
            Object.entries(mappingUsed).forEach(([hdr, field]) => {
              const nh = normalizeHeader(hdr || '');
              mappingUsedNormalized[nh] = field;
            });
            mappingWarnings = warnings;
            if (entidad === 'clientes') {
              const mappedFields = Object.values(mapping).map(f => normalizeHeader(f));
              if (!mappedFields.includes('name')) {
                mappingWarnings.push('missingFields:name');
              }
            }
          }
          try {
            const objeto = {};
            Object.entries(mappingUsedNormalized).forEach(([normHdr, field]) => {
              const idx = detectedHeaders.findIndex(h => h === normHdr);
              if (idx >= 0) {
                const rawHdr = rawHeaders[idx];
                objeto[field] = row[rawHdr];
              }
            });
            // validate
            if (entidad === 'clientes') {
              console.debug('objeto CSV fila ' + procesados + ':', JSON.stringify(objeto));
              const hasId = objeto.name || objeto.email || objeto.phone ||
                            objeto.cellphone || objeto.cellPhone || objeto.idMember;
              if (!hasId) {
                invalidCount++;
                invalidRows.push({ fila: procesados, motivo: 'missing identity fields' });
                return;
              }
            }
            registros.push(objeto);
          } catch (error) {
            errores.push({
              fila: procesados,
              error: error.message,
              acción: 'ignorado'
            });
          }
        })
        .on('end', async () => {
          try {
            let inseridos = 0;
            let actualizados = 0;

            let fallidosDB = 0;
            if (entidad === 'clientes') {
              const resultado = await this._importarClientes(registros, syncId);
              inseridos = resultado.insertedCount;
              actualizados = resultado.updatedCount;
              fallidosDB = resultado.skippedCount || 0;
              invalidCount += resultado.invalidCount || 0;
            } else if (entidad === 'ventas') {
              const resultado = await this._importarVentas(registros, syncId);
              inseridos = resultado.inseridos;
              actualizados = resultado.actualizados;
            } else if (entidad === 'leads') {
              const resultado = await this._importarLeads(registros, syncId);
              inseridos = resultado.inseridos;
              actualizados = resultado.actualizados;
            } else if (entidad === 'agendamientos') {
              const resultado = await this._importarAgendamientos(registros, syncId);
              inseridos = resultado.inseridos;
              actualizados = resultado.actualizados;
            }

            const finalizado = new Date();
            skippedCount = errores.length;
            const totalFallidos = skippedCount + fallidosDB + invalidCount;
            let estatusFinal = 'Exitoso';
            if (totalFallidos > 0 && (inseridos > 0 || actualizados > 0)) {
              estatusFinal = 'Parcial';
            } else if (totalFallidos > 0 && inseridos === 0 && actualizados === 0) {
              estatusFinal = 'Fallido';
            }
            await updateSyncLog(syncId, {
              entidad,
              estatus: estatusFinal,
              registosProcesados: procesados,
              registosInseridos: inseridos,
              registosActualizados: actualizados,
              registosFallidos: totalFallidos,
              totalRows: procesados,
              insertedCount: inseridos,
              updatedCount: actualizados,
              skippedCount: skippedCount,
              invalidCount: invalidCount,
              warnings: [...mappingWarnings, ...invalidRows.map(r=>r.motivo)],
              mappingUsed,
              detectedHeaders,
              sheetName: null,
              errores,
              finalizado,
              duracionMs: baseLog?.iniciado ? finalizado - new Date(baseLog.iniciado) : null,
              cambios: {
                clientesNuevos: entidad === 'clientes' ? inseridos : 0,
                clientesActualizados: entidad === 'clientes' ? actualizados : 0,
                ventasNuevas: entidad === 'ventas' ? inseridos : 0
              }
            });

            resolve({
              syncId,
              totalRows: procesados,
              insertedCount: inseridos,
              skippedCount: skippedCount,
              invalidCount: invalidCount,
              mappingUsed,
              detectedHeaders,
              sheetName: null,
              warnings: mappingWarnings,
              registosProcesados: procesados,
              registosInseridos: inseridos,
              registosActualizados: actualizados,
              registosFallidos: totalFallidos,
              errores,
              estatus: estatusFinal
            });

            // Limpiar
            if (fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }
          } catch (error) {
            reject(error);
          }
        });
    });
  }

  /**
   * Mapear fila de Excel a schema
   * @private
   */
  _mapearFila(row, mapeo) {
    const objeto = {};

    Object.entries(mapeo).forEach(([columna, campo]) => {
      const valor = row.getCell(columna).value;
      this._asignarValor(objeto, campo, valor);
    });

    return objeto;
  }

  /**
   * Mapear fila de CSV a schema
   * @private
   */
  _mapearFilaCSV(row, mapeo) {
    const objeto = {};

    Object.entries(mapeo).forEach(([columnaCSV, campo]) => {
      const valor = row[columnaCSV];
      this._asignarValor(objeto, campo, valor);
    });

    return objeto;
  }

  /**
   * Asignar valor a objeto anidado (ej. "cliente.nombre" → objeto.cliente.nombre)
   * @private
   */
  _asignarValor(objeto, ruta, valor) {
    const partes = ruta.split('.');
    let actual = objeto;

    for (let i = 0; i < partes.length - 1; i++) {
      if (!actual[partes[i]]) {
        actual[partes[i]] = {};
      }
      actual = actual[partes[i]];
    }

    actual[partes[partes.length - 1]] = valor;
  }

  /**
   * Importar clientes (detectar duplicados e insertar/actualizar)
   * @private
   */
  async _importarClientes(registros, syncId) {
    let insertedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let invalidCount = 0;

    for (let reg of registros) {
      if (!reg || typeof reg !== 'object') continue;

      console.log('RAW REGISTRO KEYS:', Object.keys(registros[0] || {}));
      console.log('RAW REGISTRO SAMPLE:', JSON.stringify(registros[0], null, 2));

      // Normalizar TODAS las keys a minúscula
      const r = Object.fromEntries(
        Object.entries(reg).map(([k, v]) => [k.toLowerCase(), v])
      );

      const email       = r.email || null;
      const idMemberRaw = r.idmember || r.id_miembro || null;
      const rutRaw      = r.rut || r.cpf || null;

      const hasIdentifier = !!email || !!rutRaw || !!idMemberRaw;
      if (!hasIdentifier) { invalidCount++; continue; }

      // El objeto 'r' ya tiene todas las keys en minúscula (por el Object.fromEntries toLowerCase)
      // por eso buscamos solo en minúscula. detectMapping mapea a 'name' y 'lastName',
      // pero tras el toLowerCase 'lastName' se convierte en 'lastname'.
      const firstName = (r.name    || r.nombre   || r.firstname || '').toString().trim();
      const lastName  = (r.lastname || r.apellido || r.surname   || '').toString().trim();
      const fullName  = lastName ? `${firstName} ${lastName}`.trim() : firstName;

      const telefono = r.cellphone || r.telefono || r.teléfono || r.celular || r.phone || r.mobile || null;

      const uniqueId = r.uniqueid || idMemberRaw || email || uuidv4();
      const idMember = idMemberRaw || uniqueId;

      console.log('AUDIT name:', fullName, '| email:', email, '| idMember:', idMember);

      const docData = {
        uniqueId, idMember,
        name: fullName,
        nombre_cliente: fullName,
        email,
        correo: email,
        cellPhone: telefono,
        telefono: telefono,
        cpf: rutRaw,
        rut: rutRaw,
        registrationDate: r.registrationdate || r.fecharegistro || null,
        fecha_registro: r.registrationdate || r.fecharegistro || null,
        origen: r.origen || r.source || null,
        source: 'import_excel',
        customFields: r
      };

      try {
        let cliente = null;
        if (idMember) cliente = await Cliente.findOne({ idMember });
        if (!cliente && email) cliente = await Cliente.findOne({ email });

        if (cliente) {
        cliente.name           = fullName || cliente.name;
        cliente.nombre_cliente = fullName || cliente.nombre_cliente;
        if (email) { cliente.email = email; cliente.correo = email; }
        if (telefono != null) { cliente.cellPhone = telefono; cliente.telefono = telefono; }
        if (rutRaw) { cliente.cpf = rutRaw; cliente.rut = rutRaw; }
        cliente.customFields = { ...cliente.customFields, ...r };
        await cliente.save();
        updatedCount++;
        } else {
          console.log('ABOUT TO CREATE docData.name:', docData.name);
          await Cliente.create(docData);
          insertedCount++;
        }
      } catch (error) {
        logger.error('Error importando cliente:', error, { registro: reg });
        skippedCount++;
      }
    }

    return { totalRows: registros.length, insertedCount, updatedCount, skippedCount, invalidCount };
  }

  /**
   * Importar ventas
   * @private
   */
  // ─── REEMPLAZA el método _importarVentas en importService.js ─────────────────
  // Los campos mapeados por detectMapping con las columnas del Excel son:
  //   memberName, whatsapp, saleDate, dueDate, saleType,
  //   paymentStatus, employeeName, fechaCompra, planName,
  //   amount, discount, tax, branchName

  async _importarVentas(registros, syncId) {
    const Venta = require('../models/Venta');
    let inseridos = 0;
    let actualizados = 0;
    let errores = 0;
    const erroresDetalle = [];

    for (const reg of registros) {
      try {
        // Normalizar keys a lowercase para acceso uniforme
        const r = {};
        Object.entries(reg).forEach(([k, v]) => { r[k.toLowerCase()] = v; });

        console.log('[_importarVentas] fila raw keys:', Object.keys(r));

        // ── Helpers ──────────────────────────────────────────────────────────
        const parseFecha = (v) => {
          if (!v) return null;
          // ExcelJS puede devolver Date directamente
          if (v instanceof Date) return isNaN(v) ? null : v;
          const d = new Date(v);
          return isNaN(d) ? null : d;
        };

        const parseNum = (v) => {
          const n = Number(String(v).replace(/[^0-9.\-]/g, ''));
          return Number.isFinite(n) ? n : 0;
        };

        // ── Extraer campos (nombres en minúscula tras toLowerCase) ───────────
        // detectMapping mapea a: memberName→membername, employeeName→employeename, etc.
        const memberName   = r.membername   || r.memberName   || null;
        const whatsapp     = r.whatsapp     || r.cellphone    || null;
        const saleDate     = parseFecha(r.saledate     || r.fecha_de_ingreso) || new Date();
        const dueDate      = parseFecha(r.duedate      || r.fecha_de_visita__hora) || null;
        const saleType     = r.saletype     || r.tipo_de_invitacion || null;
        const paymentStatus= r.paymentstatus|| r.estado_asistiono_asistio || 'Pendiente';
        const employeeName = r.employeename || r.vendedor     || null;
        const fechaCompra  = parseFecha(r.fechacompra  || r.fecha_de_compra) || null;
        const planName     = r.planname     || r.plan          || null;
        const amount       = parseNum(r.amount    || r.monto);
        const discount     = parseNum(r.discount  || r.descuento);
        const tax          = parseNum(r.tax        || r.inscripcion);
        const branchName   = r.branchname   || r.sede          || null;

        // idSale estable: memberName + saleDate + amount
        const idSale = [
          memberName || '',
          saleDate ? saleDate.toISOString().slice(0, 10) : '',
          amount,
        ].join('|') || uuidv4();

        console.log('[_importarVentas] procesando:', {
          memberName, saleDate, saleType, paymentStatus, employeeName, planName,
          amount, discount, tax, branchName, idSale,
        });

        const docData = {
          idSale,
          memberName,
          cellPhone:     whatsapp,
          saleDate,
          dueDate,
          fechaCompra,
          saleType,
          paymentStatus,
          employeeName,
          planName,
          amount,
          discount,
          tax,
          totalAmount:   amount - discount + tax,
          branchName,
          source:        'import_excel',
          lastSyncAt:    new Date(),
        };

        const existing = await Venta.findOne({ idSale }).lean();
        if (existing) {
          await Venta.findByIdAndUpdate(existing._id, { $set: docData });
          actualizados++;
        } else {
          await Venta.create(docData);
          inseridos++;
        }

      } catch (error) {
        errores++;
        erroresDetalle.push(error.message);
        if (errores <= 5) {
          console.error('[_importarVentas] error fila:', error.message, JSON.stringify(reg));
        }
      }
    }

    console.log(`[_importarVentas] RESULTADO: inseridos=${inseridos} actualizados=${actualizados} errores=${errores}`);
    if (erroresDetalle.length > 0) {
      console.error('[_importarVentas] Errores:', erroresDetalle.slice(0, 5));
    }

    return { inseridos, actualizados, errores };
  }

  /**
   * Importar leads
   * @private
   */
  async _importarLeads(registros, syncId) {
    const Lead = require('../models/Lead');
    let inseridos = 0;
    let actualizados = 0;
    let errores = 0;
    const erroresDetalle = [];

    for (const reg of registros) {
      try {
        // Normalizar keys a lowercase para acceso uniforme
        const r = {};
        Object.entries(reg).forEach(([k, v]) => { r[k.toLowerCase()] = v; });

        const parseNum = (v) => {
          const n = Number(String(v).replace(/[^0-9.\-]/g, ''));
          return Number.isFinite(n) ? n : 0;
        };

        const nombre   = r.nombre || r.name || r.firstname || null;
        const email    = r.email || null;
        const telefono = r.telefono || r.phone || r.cellphone || r.whatsapp || null;
        const fuente   = r.fuente || r.source || r.origen || 'import_excel';
        const estatus  = r.estatus || r.status || r.estado || 'Nuevo';
        const leadScore = parseNum(r.leadscore || r.score || 0);

        const leadId = [nombre || '', email || '', telefono || ''].join('|') || uuidv4();

        const docData = {
          leadId,
          nombre,
          email,
          telefono,
          fuente,
          estatus,
          leadScore,
          source: 'import_excel',
          lastSyncAt: new Date(),
        };

        const existing = await Lead.findOne({ leadId }).lean();
        if (existing) {
          await Lead.findByIdAndUpdate(existing._id, { $set: docData });
          actualizados++;
        } else {
          await Lead.create(docData);
          inseridos++;
        }
      } catch (error) {
        errores++;
        erroresDetalle.push(error.message);
        if (errores <= 5) {
          console.error('[_importarLeads] error fila:', error.message, JSON.stringify(reg));
        }
      }
    }

    console.log(`[_importarLeads] RESULTADO: inseridos=${inseridos} actualizados=${actualizados} errores=${errores}`);
    if (erroresDetalle.length > 0) {
      console.error('[_importarLeads] Errores:', erroresDetalle.slice(0, 5));
    }

    return { inseridos, actualizados, errores };
  }

  /**
   * Importar agendamientos
   * @private
   */
  async _importarAgendamientos(registros, syncId) {
    const Agendamiento = require('../models/Agendamiento');
    let inseridos = 0;
    let actualizados = 0;
    let errores = 0;
    const erroresDetalle = [];

    for (const reg of registros) {
      try {
        // Normalizar keys a lowercase
        const r = {};
        Object.entries(reg).forEach(([k, v]) => { r[k.toLowerCase()] = v; });

        const parseFecha = (v) => {
          if (!v) return null;
          if (v instanceof Date) return isNaN(v) ? null : v;
          const d = new Date(v);
          return isNaN(d) ? null : d;
        };

        const memberName      = r.membername || r.nombre || r.name || null;
        const idBranch        = r.idbranch || r.sede || r.branch || null;
        const branchName      = r.branchname || r.nombresede || null;
        const appointmentType = r.appointmenttype || r.tipo || 'evaluacion';
        const startDate       = parseFecha(r.startdate || r.fecha || r.fechainicio) || new Date();
        const endDate         = parseFecha(r.enddate || r.fechafin) || startDate;
        let status            = r.status || r.estado || r.estadoasistio || 'programado';
        // normalize status to 'completado' if matches attended variations
        const stLower = (status || '').toString().toLowerCase();
        if (stLower.includes('asist') || stLower === 'completado') {
          status = 'completado';
        }
        const checkedIn = ['completado','asistio','attended'].includes(stLower);

        const title = r.title || r.titulo || memberName || 'Agendamiento';

        const idAppointment = [memberName || '', startDate.toISOString().slice(0,10), idBranch || ''].join('|') || uuidv4();

        const docData = {
          idAppointment,
          memberName,
          idBranch,
          branchName,
          appointmentType,
          title,
          startDate,
          endDate,
          status,
          checkedIn,
          source: 'import_excel',
          lastSyncAt: new Date()
        };

        const existing = await Agendamiento.findOne({ idAppointment }).lean();
        if (existing) {
          await Agendamiento.findByIdAndUpdate(existing._id, { $set: docData });
          actualizados++;
        } else {
          await Agendamiento.create(docData);
          inseridos++;
        }
      } catch (error) {
        errores++;
        erroresDetalle.push(error.message);
        if (errores <= 5) {
          console.error('[_importarAgendamientos] error fila:', error.message, JSON.stringify(reg));
        }
      }
    }

    console.log(`[_importarAgendamientos] RESULTADO: inseridos=${inseridos} actualizados=${actualizados} errores=${errores}`);
    if (erroresDetalle.length > 0) {
      console.error('[_importarAgendamientos] Errores:', erroresDetalle.slice(0, 5));
    }

    return { inseridos, actualizados, errores };
  }

  /**
   * Obtener preview de archivo antes de importar
   */
  async previewExcelFile(file) {
  let filePath = file.path;
  try {
    const workbook = new ExcelJS.Workbook();
    const absolutePath = require('path').resolve(filePath);
    console.log('[PREVIEW] reading file:', absolutePath, 'exists:', require('fs').existsSync(absolutePath));
    await workbook.xlsx.readFile(absolutePath);
    
    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) throw new Error('No se encontró hoja en el archivo');

    const columnas = [];
    const primerosRegistros = [];

    // Obtener encabezados usando getCell para no saltarse columnas vacías
    const headerRow = worksheet.getRow(1);
    const lastCol = worksheet.columnCount || headerRow.cellCount;
    
    for (let c = 1; c <= lastCol; c++) {
      const cell = headerRow.getCell(c);
      const val = cell.value;
      columnas.push(val !== null && val !== undefined ? String(val).trim() : '');
    }

    // Filtrar columnas completamente vacías del final
    while (columnas.length > 0 && columnas[columnas.length - 1] === '') {
      columnas.pop();
    }

    // Obtener primeras 10 filas de datos
    let count = 0;
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1 || count >= 10) return;
      const valores = {};
      for (let c = 1; c <= columnas.length; c++) {
        const cell = row.getCell(c);
        let val = cell.value;
        // ExcelJS puede devolver objetos richText o formula
        if (val && typeof val === 'object') {
          if (val.richText) val = val.richText.map(r => r.text).join('');
          else if (val.result !== undefined) val = val.result;
          else if (val.text !== undefined) val = val.text;
          else val = String(val);
        }
        valores[columnas[c - 1]] = val ?? null;
      }
      primerosRegistros.push(valores);
      count++;
    });

    return { columnas, primerosRegistros };
  } catch (error) {
    logger.error('Error en preview:', error);
    throw error;
  } finally {
    try {
      if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch {}
  }
}

  /**
   * Preview de archivo CSV (primeras 10 filas)
   */
  async previewCSVFile(file) {
    const csvParser = require('csv-parser');
    const fs = require('fs');
    const filePath = file.path;
    return new Promise((resolve, reject) => {
      const columnas = [];
      const primerosRegistros = [];
      let count = 0;
      let headersDetected = false;

      fs.createReadStream(filePath)
        .pipe(csvParser())
        .on('headers', (hdrs) => {
          hdrs.forEach(h => columnas.push(h));
          headersDetected = true;
        })
        .on('data', (row) => {
          if (count < 10) {
            primerosRegistros.push(row);
            count++;
          }
        })
        .on('end', () => {
          try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (_) {}
          resolve({ columnas, primerosRegistros });
        })
        .on('error', (err) => {
          try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (_) {}
          reject(err);
        });
    });
  }
}

module.exports = new ImportService();

