// sencillo cliente de importación para el frontend "landing"
// no utiliza axios (fetch nativo) para mantener coherencia con Login.jsx

import { getAccessToken } from '../config/authStorage';

const BASE_URL = '/api/import'; // proxy de Vite redirige a data-intake

export async function previewImport(file, options = {}) {
  const { entity = 'clientes', mapping = {} } = options;
  const formData = new FormData();
  formData.append('file', file);
  formData.append('entity', entity);
  formData.append('mapping', JSON.stringify(mapping));
  const headers = {};
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}/preview`, {
    method: 'POST',
    headers,
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const error = new Error(err.error || `Error preview (HTTP ${res.status})`);
    error.status = res.status;
    if (err.details) error.details = err.details;
    throw error;
  }
  return res.json();
}

// commitImport sends data to the new /commit endpoints and waits for completion
export async function commitImport(file, options = {}) {
  const { entity = 'clientes', mapping = {}, delimiter = ',', importId } = options;
  const formData = new FormData();
  formData.append('file', file);
  formData.append('mapeo', JSON.stringify(mapping));
  formData.append('entidad', entity);
  if (importId) {
    formData.append('importId', importId);
  }
  if (file.name.toLowerCase().endsWith('.csv')) {
    formData.append('delimitador', delimiter);
  }

  const route = file.name.toLowerCase().endsWith('.csv') ? 'csv/commit' : 'excel/commit';
  const headers = {};
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}/${route}`, {
    method: 'POST',
    headers,
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const error = new Error(err.error || `Error import (HTTP ${res.status})`);
    error.status = res.status;
    if (err.details) error.details = err.details;
    throw error;
  }
  return res.json();
}

// keep old importFile pointing to non-commit route (used elsewhere?)
export async function importFile(file, options = {}) {
  return commitImport(file, options);
}

export async function fetchImportHistory() {
  const headers = {};
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}/history`, { headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const error = new Error(err.error || `Error history (HTTP ${res.status})`);
    error.status = res.status;
    if (err.details) error.details = err.details;
    throw error;
  }
  const data = await res.json();
  // propagate connection flag if backend ever starts returning it
  return data;
}

export async function setImportVisibility(importId, visible) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`/api/imports/${importId}/visibility`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ visible })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const error = new Error(err.error || 'Error changing visibility');
    if (err.details) error.details = err.details;
    throw error;
  }
  return res.json();
}

export async function deleteImport(importId) {
  const headers = {};
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`/api/imports/${importId}`, { method: 'DELETE', headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const error = new Error(err.error || 'Error deleting import');
    if (err.details) error.details = err.details;
    throw error;
  }
  return res.json();
}
