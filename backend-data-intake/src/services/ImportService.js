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
const { logger } = require('../utils/logger');

class ImportService {
  /**
   * Procesar archivo Excel
   * @param {File} file - Archivo subido
   * @param {Object} mapeo - Mapeo de columnas { 'Nombre Excel': 'campo.schema' }
   * @param {String} entidad - 'clientes', 'ventas', 'leads'
   */
  async processExcelFile(file, mapeo, entidad = 'clientes') {
    const syncId = uuidv4();
    const baseLog = await createSyncLog({
      syncId,
      fuente: 'Excel',
      estatus: 'Procesando',
      iniciado: new Date()
    });

    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(file.path);
      const worksheet = workbook.getWorksheet(1);

      const registros = [];
      const errores = [];
      let procesados = 0;
      let inseridos = 0;
      let actualizados = 0;

      // Leer filas (ignorar encabezados)
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header

        try {
          const objeto = this._mapearFila(row, mapeo);
          registros.push(objeto);
          procesados++;
        } catch (error) {
          errores.push({
            fila: rowNumber,
            error: error.message,
            acción: 'ignorado'
          });
        }
      });

      // Procesar según entidad
      if (entidad === 'clientes') {
        const resultado = await this._importarClientes(registros, syncId);
        inseridos = resultado.inseridos;
        actualizados = resultado.actualizados;
      } else if (entidad === 'ventas') {
        const resultado = await this._importarVentas(registros, syncId);
        inseridos = resultado.inseridos;
        actualizados = resultado.actualizados;
      }

      // Registrar en syncLog
      const finalizado = new Date();
      await updateSyncLog(syncId, {
        estatus: errores.length === 0 ? 'Exitoso' : 'Parcial',
        registosProcesados: procesados,
        registosInseridos: inseridos,
        registosActualizados: actualizados,
        registosFallidos: errores.length,
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
        registosProcesados: procesados,
        registosInseridos: inseridos,
        registosActualizados: actualizados,
        registosFallidos: errores.length,
        errores,
        estatus: errores.length === 0 ? 'Exitoso' : 'Parcial'
      };
    } catch (error) {
      logger.error('❌ Error en importación Excel:', error);
      await updateSyncLog(syncId, {
        estatus: 'Fallido',
        errores: [{ error: error.message }],
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
  async processCSVFile(file, mapeo, entidad = 'clientes', delimitador = ',') {
    const syncId = uuidv4();

    const baseLog = await createSyncLog({
      syncId,
      fuente: 'CSV',
      estatus: 'Procesando',
      iniciado: new Date()
    });

    return new Promise((resolve, reject) => {
      const registros = [];
      const errores = [];
      let procesados = 0;

      fs.createReadStream(file.path)
        .pipe(csv({ separator: delimitador }))
        .on('data', (row) => {
          try {
            const objeto = this._mapearFilaCSV(row, mapeo);
            registros.push(objeto);
            procesados++;
          } catch (error) {
            errores.push({
              fila: procesados + 1,
              error: error.message,
              acción: 'ignorado'
            });
          }
        })
        .on('end', async () => {
          try {
            let inseridos = 0;
            let actualizados = 0;

            if (entidad === 'clientes') {
              const resultado = await this._importarClientes(registros, syncId);
              inseridos = resultado.inseridos;
              actualizados = resultado.actualizados;
            } else if (entidad === 'ventas') {
              const resultado = await this._importarVentas(registros, syncId);
              inseridos = resultado.inseridos;
              actualizados = resultado.actualizados;
            }

            const finalizado = new Date();
            await updateSyncLog(syncId, {
              estatus: errores.length === 0 ? 'Exitoso' : 'Parcial',
              registosProcesados: procesados,
              registosInseridos: inseridos,
              registosActualizados: actualizados,
              registosFallidos: errores.length,
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
              registosProcesados: procesados,
              registosInseridos: inseridos,
              registosActualizados: actualizados,
              registosFallidos: errores.length,
              errores,
              estatus: errores.length === 0 ? 'Exitoso' : 'Parcial'
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
    let inseridos = 0;
    let actualizados = 0;

    for (const reg of registros) {
      try {
        // Buscar duplicado por email, RFC o clienteId
        const resultado = await upsertCliente({
          ...reg,
          clienteId: reg.clienteId || uuidv4(),
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
        logger.error('Error importando cliente:', error, { registro: reg });
      }
    }

    return { inseridos, actualizados };
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
