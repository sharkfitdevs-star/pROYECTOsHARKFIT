/**
 * _base.js
 * Clase base para todas las entities del dashboard.
 * Mapea los métodos list/filter/create/update/delete
 * al cliente HTTP real o devuelve datos vacíos de forma segura.
 */
import client from '../api/client';

export class BaseEntity {
  constructor(endpoint) {
    this.endpoint = endpoint; // null = sin backend todavía
  }

  async list(_sort) {
    if (!this.endpoint) return [];
    try {
      const res = await client.get(this.endpoint);
      return res.data?.data || res.data?.clientes || res.data?.ventas || [];
    } catch { return []; }
  }

  async filter(filters = {}, _sort) {
    if (!this.endpoint) return [];
    try {
      const res = await client.get(this.endpoint, { params: filters });
      return res.data?.data || res.data?.clientes || res.data?.ventas || [];
    } catch { return []; }
  }

  async create(data) {
    if (!this.endpoint) return data;
    const res = await client.post(this.endpoint, data);
    return res.data?.data || res.data;
  }

  async update(id, data) {
    if (!this.endpoint) return data;
    const res = await client.put(`${this.endpoint}/${id}`, data);
    return res.data?.data || res.data;
  }

  async delete(id) {
    if (!this.endpoint) return null;
    await client.delete(`${this.endpoint}/${id}`);
    return id;
  }
}
