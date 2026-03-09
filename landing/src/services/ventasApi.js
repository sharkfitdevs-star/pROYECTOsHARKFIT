import { fetchAuth } from '../api/fetchAuth';
import { getAccessToken } from '../config/authStorage';

export async function fetchVentas({ page = 1, limit = 50, search = '' } = {}) {
  const token = getAccessToken();
  if (!token) {
    console.warn('fetchVentas: no token');
    return { data: [], total: 0 };
  }

  const params = new URLSearchParams({ page, limit });
  if (search) params.set('q', search);

  try {
    const raw = await fetchAuth(`/api/ventas?${params.toString()}`, { method: 'GET' });
    const items = Array.isArray(raw?.data) ? raw.data
                : Array.isArray(raw?.ventas) ? raw.ventas
                : Array.isArray(raw) ? raw : [];
    const total = typeof raw?.total === 'number' ? raw.total : items.length;
    return { data: items, total };
  } catch (err) {
    console.error('fetchVentas error:', err);
    return { data: [], total: 0 };
  }
} 
