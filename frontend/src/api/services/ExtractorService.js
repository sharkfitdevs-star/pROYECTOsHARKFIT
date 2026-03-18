import client from '../client';
import { API_ENDPOINTS } from '../endpoints';

class ExtractorService {

  async getConfigs() {
    const res = await client.get(API_ENDPOINTS.EXTRACTOR.CONFIG);
    return res.data;
  }

  async deleteConfig(connectionName) {
    const res = await client.delete(API_ENDPOINTS.EXTRACTOR.CONFIG_DELETE(connectionName));
    return res.data;
  }

  async saveConfig(data) {
    const res = await client.post(API_ENDPOINTS.EXTRACTOR.CONFIG, data);
    return res.data;
  }

  /**
   * Inicia una importación.
   * Si hay conflicto el backend devuelve 409 con { conflict: true, jobId, excelRecordCount }.
   * En ese caso NO lanzar error — devolver el objeto para que la UI muestre el modal.
   */
  async run({ configId, dataset, dateRange }) {
    try {
      const res = await client.post(API_ENDPOINTS.EXTRACTOR.RUN, { configId, dataset, dateRange });
      return res.data;
    } catch (err) {
      if (err.response?.status === 409) {
        return err.response.data; // { conflict: true, jobId, excelRecordCount, message }
      }
      throw err;
    }
  }

  /**
   * Confirma la estrategia de resolución tras un conflicto.
   * strategy: 'replace' | 'overwrite' | 'complement' | 'cancel'
   */
  async resolve({ jobId, strategy, configId, dataset, dateRange }) {
    const res = await client.post(API_ENDPOINTS.EXTRACTOR.RESOLVE, {
      jobId, strategy, configId, dataset, dateRange,
    });
    return res.data;
  }

  async getStatus(jobId) {
    const res = await client.get(API_ENDPOINTS.EXTRACTOR.STATUS(jobId));
    return res.data;
  }

  async getLogs({ source, status, limit = 20 } = {}) {
    const res = await client.get(API_ENDPOINTS.EXTRACTOR.LOGS, {
      params: { source, status, limit },
    });
    return res.data;
  }
}

export default new ExtractorService();
/**
   * Descubre cuántos registros hay disponibles en EVO por dataset.
   * Usa take=1&skip=0 y lee X-Total-Count del header (confirmado con soporte EVO).
   * Consume 1 hit por dataset (6 hits totales).
   */
  async discoverData(configId) {
    const res = await client.post(API_ENDPOINTS.EXTRACTOR.DISCOVER, { configId });
    return res.data;
  }

  /**
   * Ejecuta importación selectiva de uno o más datasets.
   * @param {string} configId
   * @param {Array<{type: string, targetSection: string}>} selections
   */
  async runSelective(configId, selections = []) {
    try {
      const res = await client.post(API_ENDPOINTS.EXTRACTOR.RUN_SELECTIVE, {
        configId,
        selections,
      });
      return res.data;
    } catch (err) {
      if (err.response?.status === 409) {
        return err.response.data;
      }
      throw err;
    }
  }