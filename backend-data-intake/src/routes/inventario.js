const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { requireAuth, requireRole } = require('../middleware/auth');
const { logger } = require('../utils/logger');

const Producto = require('../models/inventario/Producto');
const Proveedor = require('../models/inventario/Proveedor');
const Inventario = require('../models/inventario/Inventario');
const MovimientoInventario = require('../models/inventario/MovimientoInventario');
const Entrega = require('../models/inventario/Entrega');
const OrdenCompra = require('../models/inventario/OrdenCompra');

// ============================================================================
// PRODUCTOS
// ============================================================================

router.get('/productos', requireAuth, async (req, res) => {
  try {
    const { page = 1, limit = 50, categoria, estado = 'activo', busqueda, sede, stock_bajo } = req.query;
    const query = {};
    if (estado) query.estado = estado;
    if (categoria) query.categoria = categoria;
    if (sede) query.sede = sede;
    if (busqueda) {
      query.$or = [
        { nombre: { $regex: busqueda, $options: 'i' } },
        { sku: { $regex: busqueda, $options: 'i' } },
        { descripcion: { $regex: busqueda, $options: 'i' } }
      ];
    }
    if (stock_bajo === 'true') {
      query.$expr = { $lte: ['$stock_actual', '$stock_minimo'] };
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [productos, total] = await Promise.all([
      Producto.find(query)
        .populate('proveedor_principal', 'nombre')
        .populate('sede', 'nombre')
        .sort({ nombre: 1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Producto.countDocuments(query)
    ]);
    res.json({
      success: true,
      data: productos,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (error) {
    logger.error('Error al listar productos', { error: error.message });
    res.status(500).json({ success: false, error: 'Error al obtener productos' });
  }
});

router.get('/productos/:id', requireAuth, async (req, res) => {
  try {
    const producto = await Producto.findById(req.params.id)
      .populate('proveedor_principal', 'nombre email telefono')
      .populate('sede', 'nombre direccion');
    if (!producto) {
      return res.status(404).json({ success: false, error: 'Producto no encontrado' });
    }
    res.json({ success: true, data: producto });
  } catch (error) {
    logger.error('Error al obtener producto', { error: error.message });
    res.status(500).json({ success: false, error: 'Error al obtener producto' });
  }
});

router.post('/productos', requireAuth, requireRole(['admin', 'manager', 'owner']), async (req, res) => {
  try {
    const producto = new Producto({ ...req.body, creado_por: req.user.id });
    await producto.save();
    logger.info('Producto creado', { productoId: producto._id, sku: producto.sku });
    res.status(201).json({ success: true, data: producto });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, error: 'El SKU ya existe' });
    }
    logger.error('Error al crear producto', { error: error.message });
    res.status(500).json({ success: false, error: 'Error al crear producto' });
  }
});

router.put('/productos/:id', requireAuth, requireRole(['admin', 'manager', 'owner']), async (req, res) => {
  try {
    const producto = await Producto.findByIdAndUpdate(
      req.params.id,
      { ...req.body, actualizado_por: req.user.id },
      { new: true, runValidators: true }
    );
    if (!producto) {
      return res.status(404).json({ success: false, error: 'Producto no encontrado' });
    }
    logger.info('Producto actualizado', { productoId: producto._id });
    res.json({ success: true, data: producto });
  } catch (error) {
    logger.error('Error al actualizar producto', { error: error.message });
    res.status(500).json({ success: false, error: 'Error al actualizar producto' });
  }
});

router.delete('/productos/:id', requireAuth, requireRole(['admin', 'owner']), async (req, res) => {
  try {
    const producto = await Producto.findByIdAndUpdate(
      req.params.id,
      { estado: 'descontinuado', actualizado_por: req.user.id },
      { new: true }
    );
    if (!producto) {
      return res.status(404).json({ success: false, error: 'Producto no encontrado' });
    }
    logger.info('Producto descontinuado', { productoId: producto._id });
    res.json({ success: true, message: 'Producto descontinuado' });
  } catch (error) {
    logger.error('Error al eliminar producto', { error: error.message });
    res.status(500).json({ success: false, error: 'Error al eliminar producto' });
  }
});

// ============================================================================
// INVENTARIO (STOCK)
// ============================================================================

router.get('/', requireAuth, async (req, res) => {
  try {
    const { sede, estado = 'activo', stock_bajo } = req.query;
    const query = { estado };
    if (sede) query.sede = sede;
    if (stock_bajo === 'true') {
      query.$expr = { $lte: ['$cantidad_actual', '$stock_minimo'] };
    }
    const inventario = await Inventario.find(query)
      .populate('producto', 'nombre sku categoria precio_venta imagen')
      .populate('sede', 'nombre')
      .sort({ 'producto.nombre': 1 });
    res.json({ success: true, data: inventario });
  } catch (error) {
    logger.error('Error al listar inventario', { error: error.message });
    res.status(500).json({ success: false, error: 'Error al obtener inventario' });
  }
});

router.get('/resumen', requireAuth, async (req, res) => {
  try {
    const { sede } = req.query;
    const match = { estado: 'activo' };
    if (sede) match.sede = new mongoose.Types.ObjectId(sede);
    const resumen = await Inventario.aggregate([
      { $match: match },
      { $group: {
          _id: null,
          total_items: { $sum: 1 },
          total_unidades: { $sum: '$cantidad_actual' },
          valor_total: { $sum: '$valor_inventario' },
          stock_bajo: { $sum: { $cond: [{ $lte: ['$cantidad_actual', '$stock_minimo'] }, 1, 0] } },
          agotados: { $sum: { $cond: [{ $lte: ['$cantidad_actual', 0] }, 1, 0] } }
        }
      }
    ]);
    res.json({ success: true, data: resumen[0] || { total_items: 0, total_unidades: 0, valor_total: 0, stock_bajo: 0, agotados: 0 } });
  } catch (error) {
    logger.error('Error al obtener resumen', { error: error.message });
    res.status(500).json({ success: false, error: 'Error al obtener resumen' });
  }
});

router.post('/ajuste', requireAuth, requireRole(['admin', 'manager', 'owner']), async (req, res) => {
  try {
    const { producto_id, sede_id, cantidad, tipo, motivo } = req.body;
    if (!producto_id || !sede_id || cantidad === undefined || !tipo) {
      return res.status(400).json({ success: false, error: 'Faltan campos requeridos' });
    }
    let inventario = await Inventario.findOne({ producto: producto_id, sede: sede_id });
    if (!inventario) {
      inventario = new Inventario({ producto: producto_id, sede: sede_id, cantidad_actual: 0, creado_por: req.user.id });
    }
    await inventario.ajustarStock(cantidad, tipo, motivo, req.user.id);
    res.json({ success: true, data: inventario });
  } catch (error) {
    logger.error('Error al ajustar stock', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/movimientos', requireAuth, async (req, res) => {
  try {
    const { producto, sede, tipo, fecha_inicio, fecha_fin, limit = 100 } = req.query;
    const query = {};
    if (producto) query.producto = producto;
    if (sede) query.sede = sede;
    if (tipo) query.tipo = tipo;
    if (fecha_inicio || fecha_fin) {
      query.fecha = {};
      if (fecha_inicio) query.fecha.$gte = new Date(fecha_inicio);
      if (fecha_fin) query.fecha.$lte = new Date(fecha_fin);
    }
    const movimientos = await MovimientoInventario.find(query)
      .populate('producto', 'nombre sku')
      .populate('sede', 'nombre')
      .populate('usuario', 'firstName lastName username')
      .sort({ fecha: -1 })
      .limit(parseInt(limit));
    res.json({ success: true, data: movimientos });
  } catch (error) {
    logger.error('Error al obtener movimientos', { error: error.message });
    res.status(500).json({ success: false, error: 'Error al obtener movimientos' });
  }
});

// ============================================================================
// PROVEEDORES
// ============================================================================

router.get('/proveedores', requireAuth, async (req, res) => {
  try {
    const { estado = 'activo', categoria, busqueda } = req.query;
    const query = { activo: true };
    if (estado) query.estado = estado;
    if (categoria) query.categorias = categoria;
    if (busqueda) {
      query.$or = [
        { nombre: { $regex: busqueda, $options: 'i' } },
        { rut: { $regex: busqueda, $options: 'i' } }
      ];
    }
    const proveedores = await Proveedor.find(query).sort({ nombre: 1 });
    res.json({ success: true, data: proveedores });
  } catch (error) {
    logger.error('Error al listar proveedores', { error: error.message });
    res.status(500).json({ success: false, error: 'Error al obtener proveedores' });
  }
});

router.get('/proveedores/:id', requireAuth, async (req, res) => {
  try {
    const proveedor = await Proveedor.findById(req.params.id);
    if (!proveedor) {
      return res.status(404).json({ success: false, error: 'Proveedor no encontrado' });
    }
    res.json({ success: true, data: proveedor });
  } catch (error) {
    logger.error('Error al obtener proveedor', { error: error.message });
    res.status(500).json({ success: false, error: 'Error al obtener proveedor' });
  }
});

router.post('/proveedores', requireAuth, requireRole(['admin', 'manager', 'owner']), async (req, res) => {
  try {
    const proveedor = new Proveedor({ ...req.body, creado_por: req.user.id });
    await proveedor.save();
    logger.info('Proveedor creado', { proveedorId: proveedor._id, rut: proveedor.rut });
    res.status(201).json({ success: true, data: proveedor });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, error: 'El RUT ya existe' });
    }
    logger.error('Error al crear proveedor', { error: error.message });
    res.status(500).json({ success: false, error: 'Error al crear proveedor' });
  }
});

router.put('/proveedores/:id', requireAuth, requireRole(['admin', 'manager', 'owner']), async (req, res) => {
  try {
    const proveedor = await Proveedor.findByIdAndUpdate(
      req.params.id,
      { ...req.body, actualizado_por: req.user.id },
      { new: true, runValidators: true }
    );
    if (!proveedor) {
      return res.status(404).json({ success: false, error: 'Proveedor no encontrado' });
    }
    logger.info('Proveedor actualizado', { proveedorId: proveedor._id });
    res.json({ success: true, data: proveedor });
  } catch (error) {
    logger.error('Error al actualizar proveedor', { error: error.message });
    res.status(500).json({ success: false, error: 'Error al actualizar proveedor' });
  }
});

router.delete('/proveedores/:id', requireAuth, requireRole(['admin', 'owner']), async (req, res) => {
  try {
    const proveedor = await Proveedor.findByIdAndUpdate(
      req.params.id,
      { activo: false, estado: 'inactivo', actualizado_por: req.user.id },
      { new: true }
    );
    if (!proveedor) {
      return res.status(404).json({ success: false, error: 'Proveedor no encontrado' });
    }
    logger.info('Proveedor desactivado', { proveedorId: proveedor._id });
    res.json({ success: true, message: 'Proveedor desactivado' });
  } catch (error) {
    logger.error('Error al eliminar proveedor', { error: error.message });
    res.status(500).json({ success: false, error: 'Error al eliminar proveedor' });
  }
});

// ============================================================================
// ENTREGAS
// ============================================================================

router.get('/entregas', requireAuth, async (req, res) => {
  try {
    const { sede, proveedor, estado, fecha_inicio, fecha_fin } = req.query;
    const query = {};
    if (sede) query.sede = sede;
    if (proveedor) query.proveedor = proveedor;
    if (estado) query.estado = estado;
    if (fecha_inicio || fecha_fin) {
      query.fecha_entrega = {};
      if (fecha_inicio) query.fecha_entrega.$gte = new Date(fecha_inicio);
      if (fecha_fin) query.fecha_entrega.$lte = new Date(fecha_fin);
    }
    const entregas = await Entrega.find(query)
      .populate('proveedor', 'nombre')
      .populate('sede', 'nombre')
      .populate('orden_compra', 'numero')
      .populate('items.producto', 'nombre sku')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: entregas });
  } catch (error) {
    logger.error('Error al listar entregas', { error: error.message });
    res.status(500).json({ success: false, error: 'Error al obtener entregas' });
  }
});

router.get('/entregas/:id', requireAuth, async (req, res) => {
  try {
    const entrega = await Entrega.findById(req.params.id)
      .populate('proveedor')
      .populate('sede', 'nombre direccion')
      .populate('orden_compra')
      .populate('items.producto', 'nombre sku categoria')
      .populate('recibido_por', 'firstName lastName')
      .populate('creado_por', 'firstName lastName');
    if (!entrega) {
      return res.status(404).json({ success: false, error: 'Entrega no encontrada' });
    }
    res.json({ success: true, data: entrega });
  } catch (error) {
    logger.error('Error al obtener entrega', { error: error.message });
    res.status(500).json({ success: false, error: 'Error al obtener entrega' });
  }
});

router.post('/entregas', requireAuth, requireRole(['admin', 'manager', 'owner']), async (req, res) => {
  try {
    const entrega = new Entrega({ ...req.body, creado_por: req.user.id });
    await entrega.save();
    logger.info('Entrega creada', { entregaId: entrega._id, numero: entrega.numero });
    res.status(201).json({ success: true, data: entrega });
  } catch (error) {
    logger.error('Error al crear entrega', { error: error.message });
    res.status(500).json({ success: false, error: 'Error al crear entrega' });
  }
});

router.put('/entregas/:id', requireAuth, requireRole(['admin', 'manager', 'owner']), async (req, res) => {
  try {
    const entrega = await Entrega.findByIdAndUpdate(
      req.params.id,
      { ...req.body, actualizado_por: req.user.id },
      { new: true, runValidators: true }
    );
    if (!entrega) {
      return res.status(404).json({ success: false, error: 'Entrega no encontrada' });
    }
    logger.info('Entrega actualizada', { entregaId: entrega._id });
    res.json({ success: true, data: entrega });
  } catch (error) {
    logger.error('Error al actualizar entrega', { error: error.message });
    res.status(500).json({ success: false, error: 'Error al actualizar entrega' });
  }
});

router.post('/entregas/:id/recibir', requireAuth, requireRole(['admin', 'manager', 'owner', 'staff']), async (req, res) => {
  try {
    const entrega = await Entrega.findById(req.params.id);
    if (!entrega) {
      return res.status(404).json({ success: false, error: 'Entrega no encontrada' });
    }
    if (entrega.estado === 'entregado' || entrega.estado === 'cancelado') {
      return res.status(400).json({ success: false, error: 'La entrega ya fue procesada' });
    }
    await entrega.confirmarRecepcion(req.body.items, req.user.id);
    logger.info('Entrega recibida', { entregaId: entrega._id });
    res.json({ success: true, data: entrega });
  } catch (error) {
    logger.error('Error al recibir entrega', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/entregas/:id/cancelar', requireAuth, requireRole(['admin', 'manager', 'owner']), async (req, res) => {
  try {
    const entrega = await Entrega.findById(req.params.id);
    if (!entrega) {
      return res.status(404).json({ success: false, error: 'Entrega no encontrada' });
    }
    if (entrega.estado === 'entregado') {
      return res.status(400).json({ success: false, error: 'No se puede cancelar una entrega ya recibida' });
    }
    entrega.estado = 'cancelado';
    entrega.observaciones = req.body.motivo || 'Cancelada';
    entrega.actualizado_por = req.user.id;
    await entrega.save();
    logger.info('Entrega cancelada', { entregaId: entrega._id });
    res.json({ success: true, message: 'Entrega cancelada' });
  } catch (error) {
    logger.error('Error al cancelar entrega', { error: error.message });
    res.status(500).json({ success: false, error: 'Error al cancelar entrega' });
  }
});

// ============================================================================
// ÓRDENES DE COMPRA
// ============================================================================

router.get('/compras', requireAuth, async (req, res) => {
  try {
    const { sede, proveedor, estado, fecha_inicio, fecha_fin } = req.query;
    const query = {};
    if (sede) query.sede = sede;
    if (proveedor) query.proveedor = proveedor;
    if (estado) query.estado = estado;
    if (fecha_inicio || fecha_fin) {
      query.fecha = {};
      if (fecha_inicio) query.fecha.$gte = new Date(fecha_inicio);
      if (fecha_fin) query.fecha.$lte = new Date(fecha_fin);
    }
    const ordenes = await OrdenCompra.find(query)
      .populate('proveedor', 'nombre')
      .populate('sede', 'nombre')
      .populate('items.producto', 'nombre sku')
      .populate('solicitado_por', 'firstName lastName')
      .populate('aprobado_por', 'firstName lastName')
      .sort({ fecha: -1 });
    res.json({ success: true, data: ordenes });
  } catch (error) {
    logger.error('Error al listar órdenes', { error: error.message });
    res.status(500).json({ success: false, error: 'Error al obtener órdenes' });
  }
});

router.get('/compras/:id', requireAuth, async (req, res) => {
  try {
    const orden = await OrdenCompra.findById(req.params.id)
      .populate('proveedor')
      .populate('sede')
      .populate('items.producto')
      .populate('solicitado_por', 'firstName lastName email')
      .populate('aprobado_por', 'firstName lastName')
      .populate('entregas');
    if (!orden) {
      return res.status(404).json({ success: false, error: 'Orden no encontrada' });
    }
    res.json({ success: true, data: orden });
  } catch (error) {
    logger.error('Error al obtener orden', { error: error.message });
    res.status(500).json({ success: false, error: 'Error al obtener orden' });
  }
});

router.post('/compras', requireAuth, requireRole(['admin', 'manager', 'owner']), async (req, res) => {
  try {
    const orden = new OrdenCompra({ ...req.body, solicitado_por: req.user.id, creado_por: req.user.id });
    await orden.save();
    logger.info('Orden de compra creada', { ordenId: orden._id, numero: orden.numero });
    res.status(201).json({ success: true, data: orden });
  } catch (error) {
    logger.error('Error al crear orden', { error: error.message });
    res.status(500).json({ success: false, error: 'Error al crear orden' });
  }
});

router.put('/compras/:id', requireAuth, requireRole(['admin', 'manager', 'owner']), async (req, res) => {
  try {
    const orden = await OrdenCompra.findById(req.params.id);
    if (!orden) {
      return res.status(404).json({ success: false, error: 'Orden no encontrada' });
    }
    if (!['borrador', 'pendiente'].includes(orden.estado)) {
      return res.status(400).json({ success: false, error: 'No se puede modificar una orden aprobada o enviada' });
    }
    Object.assign(orden, req.body);
    orden.actualizado_por = req.user.id;
    await orden.save();
    logger.info('Orden actualizada', { ordenId: orden._id });
    res.json({ success: true, data: orden });
  } catch (error) {
    logger.error('Error al actualizar orden', { error: error.message });
    res.status(500).json({ success: false, error: 'Error al actualizar orden' });
  }
});

router.post('/compras/:id/enviar', requireAuth, async (req, res) => {
  try {
    const orden = await OrdenCompra.findById(req.params.id);
    if (!orden) {
      return res.status(404).json({ success: false, error: 'Orden no encontrada' });
    }
    if (orden.estado !== 'borrador') {
      return res.status(400).json({ success: false, error: 'Solo se pueden enviar órdenes en borrador' });
    }
    orden.estado = 'pendiente';
    orden.actualizado_por = req.user.id;
    await orden.save();
    logger.info('Orden enviada para aprobación', { ordenId: orden._id });
    res.json({ success: true, data: orden });
  } catch (error) {
    logger.error('Error al enviar orden', { error: error.message });
    res.status(500).json({ success: false, error: 'Error al enviar orden' });
  }
});

router.post('/compras/:id/aprobar', requireAuth, requireRole(['admin', 'owner']), async (req, res) => {
  try {
    const orden = await OrdenCompra.findById(req.params.id);
    if (!orden) {
      return res.status(404).json({ success: false, error: 'Orden no encontrada' });
    }
    await orden.aprobar(req.user.id);
    logger.info('Orden aprobada', { ordenId: orden._id });
    res.json({ success: true, data: orden });
  } catch (error) {
    logger.error('Error al aprobar orden', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/compras/:id/rechazar', requireAuth, requireRole(['admin', 'owner']), async (req, res) => {
  try {
    const orden = await OrdenCompra.findById(req.params.id);
    if (!orden) {
      return res.status(404).json({ success: false, error: 'Orden no encontrada' });
    }
    await orden.rechazar(req.user.id, req.body.motivo);
    logger.info('Orden rechazada', { ordenId: orden._id });
    res.json({ success: true, message: 'Orden rechazada' });
  } catch (error) {
    logger.error('Error al rechazar orden', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/compras/:id/enviar-proveedor', requireAuth, requireRole(['admin', 'manager', 'owner']), async (req, res) => {
  try {
    const orden = await OrdenCompra.findById(req.params.id);
    if (!orden) {
      return res.status(404).json({ success: false, error: 'Orden no encontrada' });
    }
    await orden.enviar(req.user.id);
    logger.info('Orden enviada al proveedor', { ordenId: orden._id });
    res.json({ success: true, data: orden });
  } catch (error) {
    logger.error('Error al enviar orden', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/compras/:id/crear-entrega', requireAuth, requireRole(['admin', 'manager', 'owner']), async (req, res) => {
  try {
    const orden = await OrdenCompra.findById(req.params.id);
    if (!orden) {
      return res.status(404).json({ success: false, error: 'Orden no encontrada' });
    }
    if (!['aprobada', 'enviada', 'parcial'].includes(orden.estado)) {
      return res.status(400).json({ success: false, error: 'La orden debe estar aprobada o enviada' });
    }
    const entrega = await orden.crearEntrega(req.user.id);
    logger.info('Entrega creada desde orden', { ordenId: orden._id, entregaId: entrega._id });
    res.status(201).json({ success: true, data: entrega });
  } catch (error) {
    logger.error('Error al crear entrega', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// CATÁLOGOS
// ============================================================================

router.get('/catalogos/categorias', requireAuth, (req, res) => {
  const categorias = [
    { value: 'suplementos', label: 'Suplementos' },
    { value: 'equipamiento', label: 'Equipamiento' },
    { value: 'ropa', label: 'Ropa deportiva' },
    { value: 'accesorios', label: 'Accesorios' },
    { value: 'bebidas', label: 'Bebidas' },
    { value: 'snacks', label: 'Snacks' },
    { value: 'otros', label: 'Otros' }
  ];
  res.json({ success: true, data: categorias });
});

router.get('/catalogos/unidades', requireAuth, (req, res) => {
  const unidades = [
    { value: 'unidad', label: 'Unidad' },
    { value: 'kg', label: 'Kilogramos' },
    { value: 'gr', label: 'Gramos' },
    { value: 'lt', label: 'Litros' },
    { value: 'ml', label: 'Mililitros' },
    { value: 'caja', label: 'Caja' },
    { value: 'pack', label: 'Pack' }
  ];
  res.json({ success: true, data: unidades });
});


// DELETE /api/inventario/productos/importados
router.delete('/productos/importados', requireAuth, requireRole(['admin', 'owner']), async (req, res) => {
  try {
    const result = await Producto.deleteMany({ source: { $in: ['excel', 'import', 'api'] } });
    res.json({ ok: true, deleted: result.deletedCount });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// DELETE /api/inventario/proveedores/importados
router.delete('/proveedores/importados', requireAuth, requireRole(['admin', 'owner']), async (req, res) => {
  try {
    const result = await Proveedor.deleteMany({ source: { $in: ['excel', 'import', 'api'] } });
    res.json({ ok: true, deleted: result.deletedCount });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// DELETE /api/inventario/stock/importados
router.delete('/stock/importados', requireAuth, requireRole(['admin', 'owner']), async (req, res) => {
  try {
    const result = await Inventario.deleteMany({ source: { $in: ['excel', 'import', 'api'] } });
    res.json({ ok: true, deleted: result.deletedCount });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// DELETE /api/inventario/compras/importados
router.delete('/compras/importados', requireAuth, requireRole(['admin', 'owner']), async (req, res) => {
  try {
    const result = await Compra.deleteMany({ source: { $in: ['excel', 'import', 'api'] } });
    res.json({ ok: true, deleted: result.deletedCount });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// DELETE /api/inventario/entregas/importados
router.delete('/entregas/importados', requireAuth, requireRole(['admin', 'owner']), async (req, res) => {
  try {
    const result = await Entrega.deleteMany({ source: { $in: ['excel', 'import', 'api'] } });
    res.json({ ok: true, deleted: result.deletedCount });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

module.exports = router;

