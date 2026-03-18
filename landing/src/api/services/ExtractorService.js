import client from '../client';
import { API_ENDPOINTS } from '../endpoints';

class ExtractorService {

  async getConfigs() {
    const res = await client.get(API_ENDPOINTS.EXTRACTOR.CONFIG);
    return res.data;
  }

  async saveConfig(data) {
    const res = await client.post(API_ENDPOINTS.EXTRACTOR.CONFIG, data);
    return res.data;
  }

  async run({ configId, dataset, dateRange }) {
    try {
      const res = await client.post(API_ENDPOINTS.EXTRACTOR.RUN, { configId, dataset, dateRange });
      return res.data;
    } catch (err) {
      if (err.response?.status === 409) {
        return err.response.data;
      }
      throw err;
    }
  }

  // Flujo nuevo: estimar requests y validar límites antes de confirmar
  async previewImport(configId, selections, dateRange) {
    const res = await client.post(API_ENDPOINTS.EXTRACTOR.PREVIEW, { configId, selections, dateRange });
    return res.data;
  }

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

  async discoverData(configId) {
    const res = await client.post(API_ENDPOINTS.EXTRACTOR.DISCOVER, { configId });
    return res.data;
  }

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
}

export default new ExtractorService();
