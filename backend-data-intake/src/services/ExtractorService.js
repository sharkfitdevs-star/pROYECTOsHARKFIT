const ExtractorConfig = require('../models/ExtractorConfig');
const xlsx = require('xlsx');
const csv = require('csv-parser');
const fs = require('fs');

// Importar todos los modelos
const Cliente = require('../models/Cliente');
const Venta = require('../models/Venta');
const Producto = require('../models/inventario/Producto');
const Proveedor = require('../models/inventario/Proveedor');
const Inventario = require('../models/inventario/Inventario');
const Compra = require('../models/inventario/Compra');
const Entrega = require('../models/inventario/Entrega');
const Colaborador = require('../models/rrhh/Colaborador');
const Candidato = require('../models/rrhh/Candidato');
const Remuneracion = require('../models/rrhh/Remuneracion');

// Mapeo de entidades disponibles
const ENTIDADES = {
  clientes: {
    modelo: Cliente,
    campos: ['uniqueId', 'idMember', 'name', 'email', 'cellPhone', 'birthDate', 'cpf', 'sex', 'active', 'status', 'idBranch', 'branchName', 'planName', 'planValue', 'membershipStartDate', 'membershipEndDate'],
    campoUnico: 'uniqueId',
    nombre: 'Clientes'
  },
  ventas: {
    modelo: Venta,
    campos: ['idSale', 'idMember', 'memberName', 'idBranch', 'branchName', 'saleType', 'description', 'planName', 'productName', 'amount', 'discount', 'totalAmount', 'saleDate', 'paymentStatus', 'paymentMethod', 'employeeName'],
    campoUnico: 'idSale',
    nombre: 'Ventas'
  },
  productos: {
    modelo: Producto,
    campos: ['sku', 'nombre', 'descripcion', 'categoria', 'tipo', 'marca', 'precio_venta', 'precio_costo', 'unidad_medida', 'stock_minimo', 'stock_maximo', 'estado'],
    campoUnico: 'sku',
    nombre: 'Productos'
  },
  proveedores: {
    modelo: Proveedor,
    campos: ['nombre', 'razon_social', 'rut', 'giro', 'email', 'telefono', 'direccion', 'comuna', 'ciudad', 'region', 'contacto_nombre', 'contacto_email', 'condiciones_pago', 'estado'],
    campoUnico: 'rut',
    nombre: 'Proveedores'
  },
  colaboradores: {
    modelo: Colaborador,
    campos: ['nombre', 'apellido', 'rut', 'fecha_nacimiento', 'genero', 'email', 'telefono', 'cargo', 'departamento', 'fecha_ingreso', 'tipo_contrato', 'jornada', 'sueldo_base', 'afp', 'prevision_salud', 'banco', 'tipo_cuenta', 'numero_cuenta'],
    campoUnico: 'rut',
    nombre: 'Colaboradores'
  },
  candidatos: {
    modelo: Candidato,
    campos: ['nombres', 'apellido_paterno', 'apellido_materno', 'rut', 'email', 'telefono', 'ciudad', 'cargo_postulado', 'fuente', 'años_experiencia', 'titulo_profesional', 'expectativa_salarial', 'disponibilidad_inicio'],
    campoUnico: 'rut',
    nombre: 'Candidatos'
  }
};

const ExtractorService = {
  // Obtener entidades disponibles para importación
  getEntidadesDisponibles() {
    return Object.entries(ENTIDADES).map(([key, value]) => ({
      id: key,
      nombre: value.nombre,
      campos: value.campos,
      campoUnico: value.campoUnico
    }));
  },

  async getConfiguraciones() {
    return ExtractorConfig.find({ activo: true }).sort('nombre');
  },

  async getConfiguracion(id) {
    return ExtractorConfig.findById(id);
  },

  async crearConfiguracion(data, usuarioId) {
    const config = new ExtractorConfig({ ...data, creado_por: usuarioId });
    return config.save();
  },

  async actualizarConfiguracion(id, data) {
    return ExtractorConfig.findByIdAndUpdate(id, data, { new: true });
  },

  async eliminarConfiguracion(id) {
    return ExtractorConfig.findByIdAndUpdate(id, { activo: false }, { new: true });
  },

  async procesarExcel(filePath, opciones = {}) {
    const workbook = xlsx.readFile(filePath);
    const sheetName = opciones.hoja || workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const datos = xlsx.utils.sheet_to_json(worksheet, { 
      header: opciones.header || 1,
      defval: ''
    });
    return {
      hojas: workbook.SheetNames,
      hoja_actual: sheetName,
      filas: datos.length,
      datos: datos.slice(0, opciones.limite || 1000),
      columnas: datos.length > 0 ? Object.keys(datos[0]) : []
    };
  },

  async procesarCSV(filePath, opciones = {}) {
    return new Promise((resolve, reject) => {
      const datos = [];
      fs.createReadStream(filePath)
        .pipe(csv({ separator: opciones.separador || ',' }))
        .on('data', (row) => datos.push(row))
        .on('end', () => {
          resolve({
            filas: datos.length,
            datos: datos.slice(0, opciones.limite || 1000),
            columnas: datos.length > 0 ? Object.keys(datos[0]) : []
          });
        })
        .on('error', reject);
    });
  },

  async validarArchivo(filePath, tipo) {
    try {
      if (tipo === 'excel' || filePath.endsWith('.xlsx') || filePath.endsWith('.xls')) {
        const result = await this.procesarExcel(filePath, { limite: 10 });
        return { valido: true, tipo: 'excel', preview: result };
      } else if (tipo === 'csv' || filePath.endsWith('.csv')) {
        const result = await this.procesarCSV(filePath, { limite: 10 });
        return { valido: true, tipo: 'csv', preview: result };
      }
      return { valido: false, error: 'Tipo de archivo no soportado' };
    } catch (error) {
      return { valido: false, error: error.message };
    }
  },

  // Importar datos a una entidad específica
  async importarAEntidad(entidadId, datos, opciones = {}) {
    const entidad = ENTIDADES[entidadId];
    if (!entidad) throw new Error(`Entidad '${entidadId}' no soportada`);

    const Modelo = entidad.modelo;
    const campoUnico = entidad.campoUnico;
    const estrategia = opciones.estrategia || 'complement';

    const resultados = {
      total: datos.length,
      insertados: 0,
      actualizados: 0,
      errores: 0,
      detalles: []
    };

    for (let i = 0; i < datos.length; i++) {
      const fila = datos[i];
      try {
        // Aplicar mapeo de campos si existe
        let registro = fila;
        if (opciones.mapeo) {
          registro = {};
          Object.entries(opciones.mapeo).forEach(([origen, destino]) => {
            if (fila[origen] !== undefined && fila[origen] !== '') {
              registro[destino] = fila[origen];
            }
          });
        }

        // Agregar source
        registro.source = 'excel';
        registro.dataSource = {
          type: 'excel',
          importedAt: new Date()
        };

        const valorUnico = registro[campoUnico];
        
        if (!valorUnico) {
          resultados.errores++;
          resultados.detalles.push({ fila: i + 1, error: `Campo único '${campoUnico}' vacío` });
          continue;
        }

        // Buscar si existe
        const existente = await Modelo.findOne({ [campoUnico]: valorUnico });

        if (existente) {
          if (estrategia === 'replace' || estrategia === 'overwrite') {
            await Modelo.findByIdAndUpdate(existente._id, registro);
            resultados.actualizados++;
          } else if (estrategia === 'complement') {
            // Solo actualizar campos vacíos
            const updates = {};
            Object.entries(registro).forEach(([key, value]) => {
              if (value && !existente[key]) {
                updates[key] = value;
              }
            });
            if (Object.keys(updates).length > 0) {
              await Modelo.findByIdAndUpdate(existente._id, updates);
              resultados.actualizados++;
            }
          }
          // Si es 'cancel' no hace nada
        } else {
          await Modelo.create(registro);
          resultados.insertados++;
        }
      } catch (error) {
        resultados.errores++;
        resultados.detalles.push({ fila: i + 1, error: error.message });
      }
    }

    return resultados;
  },

  async importarDatos(filePath, configuracionId, opciones = {}) {
    // Si viene entidad directamente (nuevo flujo)
    if (opciones.entidad) {
      let datos;
      if (filePath.endsWith('.xlsx') || filePath.endsWith('.xls')) {
        const result = await this.procesarExcel(filePath, opciones);
        datos = result.datos;
      } else if (filePath.endsWith('.csv')) {
        const result = await this.procesarCSV(filePath, opciones);
        datos = result.datos;
      }
      return this.importarAEntidad(opciones.entidad, datos, opciones);
    }

    // Flujo antiguo con configuración
    const config = await ExtractorConfig.findById(configuracionId);
    if (!config) throw new Error('Configuración no encontrada');

    let datos;
    if (config.tipo === 'excel') {
      const result = await this.procesarExcel(filePath, opciones);
      datos = result.datos;
    } else if (config.tipo === 'csv') {
      const result = await this.procesarCSV(filePath, opciones);
      datos = result.datos;
    }

    // Si la config tiene entidad destino
    if (config.entidad_destino) {
      return this.importarAEntidad(config.entidad_destino, datos, {
        estrategia: opciones.estrategia || config.estrategia,
        mapeo: config.mapeo_campos
      });
    }

    return {
      total: datos.length,
      datos,
      mensaje: 'Datos procesados sin destino específico'
    };
  },

  // Generar plantilla Excel para una entidad
  async generarPlantilla(entidadId) {
    const entidad = ENTIDADES[entidadId];
    if (!entidad) throw new Error(`Entidad '${entidadId}' no soportada`);

    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.aoa_to_sheet([entidad.campos]);
    xlsx.utils.book_append_sheet(wb, ws, entidad.nombre);
    
    return xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }
};

module.exports = ExtractorService;