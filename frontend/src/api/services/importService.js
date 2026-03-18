/**
 * importService.js
 * Servicio frontend para importación Excel y historial unificado.
 */
import client from '../client';
import { API_ENDPOINTS } from '../endpoints';

class ImportService {

  async uploadExcel(file, options = {}) {
    const formData = new FormData();
    formData.append('file', file);
    if (options.dataset) formData.append('dataset', options.dataset);
    if (options.mapping) formData.append('mapping', JSON.stringify(options.mapping));
    const res = await client.post(API_ENDPOINTS.IMPORT.EXCEL, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  }

  async getStatus(jobId) {
    const res = await client.get(API_ENDPOINTS.IMPORT.STATUS(jobId));
    return res.data;
  }

  // Historial unificado: Excel (source:'excel') + API (source:'api')
  async getLogs({ source, status, limit = 20 } = {}) {
    const res = await client.get(API_ENDPOINTS.IMPORT.LOGS, {
      params: { source, status, limit },
    });
    return res.data;
  }
}

export default new ImportService();
