import { fetchAuth } from '../api/fetchAuth';

export class OverviewBIService {
  /**
   * Consulta el endpoint BI Query con los parámetros dados
   * @param {Object} params
   * @returns {Promise<{success: boolean, data: any}|null>}
   */
  static async getBIQuery(params) {
    try {
      const qs = new URLSearchParams();
      for (const k in params) {
        if (params[k] !== undefined && params[k] !== null && params[k] !== '') {
          qs.append(k, params[k]);
        }
      }
      const url = '/api/dashboard/bi-query?' + qs.toString();
      const response = await fetchAuth(url);
      return response;
    } catch (err) {
      console.error('[OverviewBIService] getBIQuery error:', err);
      return null;
    }
  }

  /**
   * Devuelve la clase de color del gauge según valor
   */
  static getGaugeColor(valor) {
    if (valor < 30) return 'gauge-danger';
    if (valor <= 70) return 'gauge-warning';
    return 'gauge-success';
  }

  /**
   * Devuelve el label textual del gauge según valor
   */
  static getGaugeLabel(valor) {
    if (valor < 30) return 'Deficiente';
    if (valor <= 70) return 'Aceptable';
    return 'Excelente';
  }

  /**
   * Calcula el ancho de cada etapa del funnel
   */
  static getFunnelWidth(index, total) {
    const widths = [100, 82, 64, 46, 30];
    return (widths[index] || 30) + '%';
  }
  /**
   * Colores para gráficos
   */
  static getChartColors() {
    return ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b84f9', '#8b5cf6', '#ec4899', '#14b8a6'];
  }

  /**
   * Formatea labels para gráficos
   */
  static formatChartLabel(value, type) {
    if (type === 'currency') {
      return OverviewBIService.formatCurrency(value);
    }
    if (type === 'percent') {
      return (value == null ? '' : value + '%');
    }
    if (type === 'number') {
      return value == null ? '' : value.toLocaleString('es-CL');
    }
    return value == null ? '' : value.toString();
  }
  static async getOverviewBI(sede = 'Global') {
    try {
      const params = sede && sede !== 'Global' ? `?sede=${encodeURIComponent(sede)}` : '';
      const response = await fetchAuth(`/api/dashboard/overview-bi${params}`);
      return response;
    } catch (err) {
      console.error('[OverviewBIService] getOverviewBI error:', err);
      return null;
    }
  }

  static formatCurrency(amount) {
    if (amount === null || amount === undefined || isNaN(amount)) return '$0';
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(amount);
  }

  static formatVariacion(valor) {
    if (valor === null || valor === undefined || isNaN(valor)) return { texto: '\u2014', color: 'neutral' };
    const num = Number(valor);
    const texto = (num > 0 ? '+' : '') + num.toFixed(1) + '%';
    const color = num > 0 ? 'success' : num < 0 ? 'danger' : 'neutral';
    return { texto, color };
  }

  static getSemaforoColor(estado) {
    return { verde: 'semaforo-verde', amarillo: 'semaforo-amarillo', rojo: 'semaforo-rojo' }[estado] || '';
  }

  static getEstadoColor(estado) {
    return { verde: 'success', amarillo: 'warning', rojo: 'danger' }[estado] || 'neutral';
  }

  static getEstadoLabel(estado) {
    return { verde: 'Normal', amarillo: 'Revisar', rojo: 'Cr\u00edtico' }[estado] || '\u2014';
  }

  static getSeveridadConfig(sev) {
    const map = {
      critica: { label: 'CR\u00cdTICA', cls: 'badge-danger' },
      alta: { label: 'ALTA', cls: 'badge-warning' },
      media: { label: 'MEDIA', cls: 'badge-warning' },
      baja: { label: 'BAJA', cls: 'badge-info' },
    };
    return map[sev] || map.media;
  }

  static timeAgo(dateStr) {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return 'Ahora';
    if (min < 60) return min + 'm';
    const hrs = Math.floor(diff / 3600000);
    if (hrs < 24) return hrs + 'h';
    return Math.floor(diff / 86400000) + 'd';
  }
}

export default OverviewBIService;
