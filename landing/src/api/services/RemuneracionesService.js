const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const RemuneracionesService = {
  getHeaders() {
    return {
      'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
      'Content-Type': 'application/json'
    };
  },

  // ============================================================================
  // LIQUIDACIONES
  // ============================================================================

  async getLiquidaciones(filtros = {}) {
    const params = new URLSearchParams(filtros).toString();
    const response = await fetch(`${API_URL}/remuneraciones?${params}`, {
      headers: this.getHeaders()
    });
    if (!response.ok) throw new Error('Error al obtener liquidaciones');
    return response.json();
  },

  async getLiquidacion(id) {
    const response = await fetch(`${API_URL}/remuneraciones/${id}`, {
      headers: this.getHeaders()
    });
    if (!response.ok) throw new Error('Error al obtener liquidación');
    return response.json();
  },

  async getResumenPeriodo(anio, mes, sede = null) {
    const params = sede ? `?sede=${sede}` : '';
    const response = await fetch(`${API_URL}/remuneraciones/resumen/${anio}/${mes}${params}`, {
      headers: this.getHeaders()
    });
    if (!response.ok) throw new Error('Error al obtener resumen');
    return response.json();
  },

  async generarPeriodo(mes, anio, sede = null, colaboradoresIds = []) {
    const response = await fetch(`${API_URL}/remuneraciones/generar-periodo`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ mes, anio, sede, colaboradores_ids: colaboradoresIds })
    });
    if (!response.ok) throw new Error('Error al generar liquidaciones');
    return response.json();
  },

  async actualizarLiquidacion(id, datos) {
    const response = await fetch(`${API_URL}/remuneraciones/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(datos)
    });
    if (!response.ok) throw new Error('Error al actualizar liquidación');
    return response.json();
  },

  async aprobarLiquidacion(id) {
    const response = await fetch(`${API_URL}/remuneraciones/${id}/aprobar`, {
      method: 'POST',
      headers: this.getHeaders()
    });
    if (!response.ok) throw new Error('Error al aprobar liquidación');
    return response.json();
  },

  async pagarLiquidacion(id, formaPago = 'transferencia', fechaPago = null) {
    const response = await fetch(`${API_URL}/remuneraciones/${id}/pagar`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ forma_pago: formaPago, fecha_pago: fechaPago })
    });
    if (!response.ok) throw new Error('Error al marcar como pagada');
    return response.json();
  },

  async anularLiquidacion(id) {
    const response = await fetch(`${API_URL}/remuneraciones/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });
    if (!response.ok) throw new Error('Error al anular liquidación');
    return response.json();
  },

  // ============================================================================
  // ADELANTOS
  // ============================================================================

  async getAdelantos(filtros = {}) {
    const params = new URLSearchParams(filtros).toString();
    const response = await fetch(`${API_URL}/remuneraciones/adelantos/lista?${params}`, {
      headers: this.getHeaders()
    });
    if (!response.ok) throw new Error('Error al obtener adelantos');
    return response.json();
  },

  async crearAdelanto(datos) {
    const response = await fetch(`${API_URL}/remuneraciones/adelantos`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(datos)
    });
    if (!response.ok) throw new Error('Error al crear adelanto');
    return response.json();
  },

  async aprobarAdelanto(id, montoAprobado = null) {
    const response = await fetch(`${API_URL}/remuneraciones/adelantos/${id}/aprobar`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ monto_aprobado: montoAprobado })
    });
    if (!response.ok) throw new Error('Error al aprobar adelanto');
    return response.json();
  },

  async rechazarAdelanto(id, motivoRechazo) {
    const response = await fetch(`${API_URL}/remuneraciones/adelantos/${id}/rechazar`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ motivo_rechazo: motivoRechazo })
    });
    if (!response.ok) throw new Error('Error al rechazar adelanto');
    return response.json();
  },

  // ============================================================================
  // CATÁLOGOS
  // ============================================================================

  async getCatalogoHaberes() {
    const response = await fetch(`${API_URL}/remuneraciones/catalogos/haberes`, {
      headers: this.getHeaders()
    });
    if (!response.ok) throw new Error('Error al obtener catálogo de haberes');
    return response.json();
  },

  async getCatalogoDescuentos() {
    const response = await fetch(`${API_URL}/remuneraciones/catalogos/descuentos`, {
      headers: this.getHeaders()
    });
    if (!response.ok) throw new Error('Error al obtener catálogo de descuentos');
    return response.json();
  },

  // ============================================================================
  // HELPERS
  // ============================================================================

  formatMonto(monto) {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(monto || 0);
  },

  getEstadoInfo(estado) {
    const estados = {
      'borrador': { label: 'Borrador', color: '#6b7280', bgColor: 'rgba(107, 114, 128, 0.2)' },
      'calculada': { label: 'Calculada', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.2)' },
      'aprobada': { label: 'Aprobada', color: '#10b981', bgColor: 'rgba(16, 185, 129, 0.2)' },
      'pagada': { label: 'Pagada', color: '#8b5cf6', bgColor: 'rgba(139, 92, 246, 0.2)' },
      'anulada': { label: 'Anulada', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.2)' }
    };
    return estados[estado] || estados['borrador'];
  },

  getMeses() {
    return [
      { value: 1, label: 'Enero' },
      { value: 2, label: 'Febrero' },
      { value: 3, label: 'Marzo' },
      { value: 4, label: 'Abril' },
      { value: 5, label: 'Mayo' },
      { value: 6, label: 'Junio' },
      { value: 7, label: 'Julio' },
      { value: 8, label: 'Agosto' },
      { value: 9, label: 'Septiembre' },
      { value: 10, label: 'Octubre' },
      { value: 11, label: 'Noviembre' },
      { value: 12, label: 'Diciembre' }
    ];
  }
};

export default RemuneracionesService;
