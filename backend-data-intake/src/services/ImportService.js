/**
 * SERVICE: ImportService
 * Manejo de importaciones desde Excel y CSV
 */

const ExcelJS = require('exceljs');
const csv = require('csv-parser');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const {
  findClienteByIdentifiers,
  upsertCliente,
  upsertVenta,
  createSyncLog,
  updateSyncLog,
  findClienteByEmail
} = require('../db/repositories');
const { normalizeHeader, detectMapping } = require('../utils/importUtils');

// mongoose model for clientes storage
const Cliente = require('../models/Cliente');
const { logger } = require('../utils/logger');

class ImportService {
  /**
   * Procesar archivo Excel
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

      // normalize mapping keys as well
      const mappingNormalized = {};
      if (mapeo && typeof mapeo === 'object') {
        Object.entries(mapeo).forEach(([k, v]) => {
          mappingNormalized[normalizeHeader(k)] = v;
        });
      }
      console.debug('Mapping normalizado:', mappingNormalized);

      const { mapping: mappingUsed, detectedHeaders, warnings: mappingWarnings } = detectMapping(headers, mappingNormalized, entidad);
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
        // build object according to mappingUsed
        Object.entries(mappingUsed).forEach(([rawHeader, field]) => {
          const colIndex = headers.findIndex((h) => h === rawHeader) + 1;
          if (colIndex > 0) {
            const valor = row.getCell(colIndex).value;
            this._asignarValor(objeto, field, valor);
          }
        });

        // validate required for clientes
        if (entidad === 'clientes') {
          const hasId = objeto.name || objeto.email || objeto.phone;
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
      let mappingUsed = {};
      let mappingWarnings = [];

      const stream = fs.createReadStream(file.path)
        .pipe(csv({ separator: delimitador }))
        .on('data', (row) => {
          procesados++; // count every row read
          if (procesados === 1) {
            // first data row gives headers
            const rawHeaders = Object.keys(row);
            detectedHeaders = rawHeaders.map((h) => normalizeHeader(h));
            console.debug('CSV headers normalizados:', detectedHeaders);

            // normalize provided mapping keys
            const mappingNormalized = {};
            if (mapeo && typeof mapeo === 'object') {
              Object.entries(mapeo).forEach(([k, v]) => {
                mappingNormalized[normalizeHeader(k)] = v;
              });
            }
            console.debug('CSV mapping normalizado:', mappingNormalized);

            const { mapping, warnings } = detectMapping(rawHeaders, mappingNormalized, entidad);
            mappingUsed = mapping;
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
            Object.entries(mappingUsed).forEach(([hdr, field]) => {
              objeto[field] = row[hdr];
            });
            // validate
            if (entidad === 'clientes') {
              if (!objeto.name && !objeto.email && !objeto.phone) {
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
    // counters required by caller
    let insertedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let invalidCount = 0;

    for (const reg of registros) {
      // only handle objects
      if (!reg || typeof reg !== 'object') continue;

      // derive required values for schema
      const {
        // legacy / español
        nombre,
        apellido,
        telefono,
        rut,
        direccion,
        fechaRegistro,
        origen,

        // modern / frontend mapping
        firstName,
        lastName,
        cellPhone,
        cellphone,
        phone,
        mobile,
        cpf,
        address,
        registrationDate,
        source,

        // identifiers
        email,
        uniqueId: uidFromReg,
        idMember: idFromReg,

        // already-mapped direct field
        name: nameFromReg,

        ...rest
      } = reg;

      const metadata = { ...rest };

      // normalize equivalences
      const computedNombre = (nameFromReg ? '' : (nombre ?? firstName ?? '')).toString().trim();
      const computedApellido = (apellido ?? lastName ?? '').toString().trim();

      const computedTelefono = telefono ?? cellPhone;
      const computedRut = rut ?? cpf;
      const computedDireccion = direccion ?? (address?.street ?? address);
      const computedFechaRegistro = fechaRegistro ?? registrationDate;
      const computedOrigen = origen ?? source;

      // compute identifiers from provided data; we'll still generate defaults
      // later, but validity is based only on what was supplied.
      const hasIdentifier = !!email || !!computedRut || !!idFromReg || !!uidFromReg;
      if (!hasIdentifier) {
        invalidCount++;
        continue;
      }

      // compute identifiers (defaults allowed after validation)
      const uniqueId = uidFromReg || idFromReg || uuidv4();
      const idMember = idFromReg || uniqueId || `import_${uuidv4()}`;

      // compute name field
      let name = (nameFromReg ?? `${computedNombre} ${computedApellido}`).trim();
      // if no name we do not fill a placeholder; email/phone will serve as identifier or row may be marked invalid

      const docData = {
        uniqueId,
        idMember,
        name,
        email,
        cellPhone: computedTelefono,
        cpf: computedRut,
        address: computedDireccion ? { street: computedDireccion } : undefined,
        registrationDate: computedFechaRegistro,
        origen: computedOrigen,
        source: 'import_excel',
        customFields: metadata
      };

      try {
        // find existing record by idMember first, then email (to avoid duplicates)
        let cliente = null;
        if (idMember) {
          cliente = await Cliente.findOne({ idMember });
        }
        if (!cliente && email) {
          cliente = await Cliente.findOne({ email });
        }

        if (cliente) {
          // ensure idMember/email consistency
          if (idMember && cliente.idMember !== idMember) cliente.idMember = idMember;
          if (email && cliente.email !== email) cliente.email = email;
          if (name) cliente.name = name;
          if (computedTelefono !== undefined) cliente.cellPhone = computedTelefono;
          if (computedDireccion !== undefined) cliente.address = computedDireccion ? { street: computedDireccion } : undefined;
          if (computedFechaRegistro !== undefined) cliente.registrationDate = computedFechaRegistro;
          if (computedOrigen !== undefined) cliente.origen = computedOrigen;
          cliente.customFields = { ...cliente.customFields, ...metadata };
          await cliente.save();
          updatedCount++;
        } else {
          try {
            await Cliente.create(docData);
            insertedCount++;
          } catch (err) {
            // handle rare duplicate key errors by falling back to update
            if (err && err.code === 11000) {
              const exist = await Cliente.findOne({ $or: [{ idMember }, { email }] });
              if (exist) {
                if (idMember && exist.idMember !== idMember) exist.idMember = idMember;
                if (email && exist.email !== email) exist.email = email;
                if (name) exist.name = name;
                if (computedTelefono !== undefined) exist.cellPhone = computedTelefono;
                if (computedDireccion !== undefined) exist.address = computedDireccion ? { street: computedDireccion } : undefined;
                if (computedFechaRegistro !== undefined) exist.registrationDate = computedFechaRegistro;
                if (computedOrigen !== undefined) exist.origen = computedOrigen;
                exist.customFields = { ...exist.customFields, ...metadata };
                await exist.save();
                updatedCount++;
              } else {
                skippedCount++;
              }
            } else {
              throw err;
            }
          }
        }
      } catch (error) {
        logger.error('Error importando cliente:', error, { registro: reg });
        skippedCount++;
      }
    }

    return {
      totalRows: registros.length,
      insertedCount,
      updatedCount,
      skippedCount,
      invalidCount
    };
  }

  /**
   * Importar ventas
   * @private
   */
  async _importarVentas(registros, syncId) {
    let inseridos = 0;
    let actualizados = 0;

    for (const reg of registros) {
      try {
        // Buscar cliente por email o clienteId
        let cliente = await findClienteByIdentifiers({
          email: reg.emailCliente,
          clienteId: reg.clienteId
        });
        if (!cliente) cliente = await findClienteByEmail(reg.emailCliente);

        if (!cliente) {
          logger.warn('Cliente no encontrado para venta:', reg);
          continue;
        }

        // Buscar venta existente
        const resultado = await upsertVenta({
          ...reg,
          clienteId: cliente.id,
          ventaId: reg.ventaId || uuidv4(),
          syncedAt: new Date(),
          fuente: 'importación'
        });

        if (resultado.updated) {
          actualizados++;
        }
        if (resultado.inserted) {
          inseridos++;
        }
      } catch (error) {
        logger.error('Error importando venta:', error, { registro: reg });
      }
    }

    return { inseridos, actualizados };
  }

  /**
   * Obtener preview de archivo antes de importar
   */
  async previewExcelFile(file) {
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(file.path);
      const worksheet = workbook.getWorksheet(1);

      const columnas = [];
      const primerosRegistros = [];

      // Obtener encabezados
      worksheet.getRow(1).eachCell((cell) => {
        columnas.push(cell.value);
      });

      // Obtener primeros 10 registros
      let count = 0;
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        if (count >= 10) return;

        const valores = [];
        row.eachCell((cell) => {
          valores.push(cell.value);
        });

        primerosRegistros.push(valores);
        count++;
      });

      return { columnas, primerosRegistros };
    } catch (error) {
      logger.error('Error en preview:', error);
      throw error;
    } finally {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    }
  }
}

module.exports = new ImportService();
