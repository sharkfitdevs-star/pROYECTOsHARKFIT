import client from '../client'
import { API_ENDPOINTS } from '../endpoints'

class ExportService {
  /**
   * Inicia un run de exportación/import. 
   * Para cargas de archivo usa startRunForm.
   * sourceType: 'universal' | 'evo' | 'excel'
   * config: object
   */
  async startRun(sourceType, config = {}) {
    try {
      const response = await client.post(API_ENDPOINTS.EXPORT.RUN, {
        sourceType,
        config,
      })
      return response.data
    } catch (error) {
      console.error('Error iniciando export run:', error)
      throw error
    }
  }

  async startRunForm(formData) {
    try {
      const response = await client.post(API_ENDPOINTS.EXPORT.RUN, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return response.data
    } catch (error) {
      console.error('Error iniciando export run (form):', error)
      throw error
    }
  }

  async confirmMetrics(runId, selectedMetrics = [], selectedViews = {}, mappings = {}) {
    try {
      let payload;
      if (Array.isArray(selectedMetrics)) {
        payload = { selectedMetrics, selectedViews, mappings };
      } else {
        // allow passing full object to override
        payload = selectedMetrics;
      }

      const response = await client.post(API_ENDPOINTS.EXPORT.METRICS(runId), payload);
      return response.data;
    } catch (error) {
      console.error('Error confirmando métricas:', error);
      throw error;
    }
  }

  async listRuns() {
    try {
      const response = await client.get(API_ENDPOINTS.EXPORT.RUNS);
      return response.data || [];
    } catch (error) {
      console.error('Error listando export runs:', error);
      throw error;
    }
  }

  async getRun(runId) {
    try {
      const response = await client.get(API_ENDPOINTS.EXPORT.RUN_BY_ID(runId));
      return response.data || null;
    } catch (error) {
      console.error('Error obteniendo run:', error);
      throw error;
    }
  }
}

// singleton export
export default new ExportService()
