import { fetchAuth } from '../api/fetchAuth';

/**
 * Obtiene los KPIs principales para el Overview del dashboard
 */
export async function fetchDashboardOverview() {
  try {
    const data = await fetchAuth('/api/dashboard/overview');
    if (data?.success && data?.data) return data.data;
    throw new Error(data?.error || 'Error al obtener overview');
  } catch (err) {
    console.error('[dashboardApi] fetchDashboardOverview error:', err);
    throw err;
  }
}