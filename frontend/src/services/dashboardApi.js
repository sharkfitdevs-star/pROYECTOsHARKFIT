import api from '../api/axios';

/**
 * Obtiene los KPIs principales para el Overview del dashboard
 */
export async function fetchDashboardOverview() {
  try {
    const response = await api.get('/api/dashboard/overview');
    if (response?.data?.success && response?.data?.data) return response.data.data;
    throw new Error(response?.data?.error || 'Error al obtener overview');
  } catch (err) {
    console.error('[dashboardApi] fetchDashboardOverview error:', err);
    throw err;
  }
}

