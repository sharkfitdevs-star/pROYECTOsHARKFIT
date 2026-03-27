import React, { useState, useEffect } from 'react';
import { getAccessToken } from '../../config/authStorage';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3005/api';

const CARDS = [
  {
    key: 'VENTAS_MES',
    title: 'Ventas',
    icon: 'bi-cart-check',
    detail: 'Ventas del mes',
    getColor: val => (val == null ? 'rojo' : val > 0 ? 'verde' : 'amarillo'),
    format: val => val == null ? '--' : val.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }),
  },
  {
    key: 'ALERTAS_ACTIVAS',
    title: 'Alertas',
    icon: 'bi-bell',
    detail: 'Alertas activas',
    getColor: val => (val == null ? 'rojo' : val === 0 ? 'verde' : val <= 3 ? 'amarillo' : 'rojo'),
    format: val => val == null ? '--' : val,
  },
  {
    key: 'CLIENTES_ACTIVOS',
    title: 'Clientes',
    icon: 'bi-people',
    detail: 'Clientes activos',
    getColor: val => (val == null ? 'amarillo' : val > 0 ? 'verde' : 'amarillo'),
    format: val => val == null ? '--' : val,
  },
  {
    key: 'TAREAS_PENDIENTES',
    title: 'Tareas',
    icon: 'bi-list-check',
    detail: 'Tareas pendientes',
    getColor: val => (val == null ? 'rojo' : val === 0 ? 'verde' : val <= 3 ? 'amarillo' : 'rojo'),
    format: val => val == null ? '--' : val,
  },
];

const COLORS = {
  verde:   { border: '#22c55e', bg: 'rgba(34,197,94,0.08)', solid: '#22c55e' },
  amarillo:{ border: '#eab308', bg: 'rgba(234,179,8,0.08)', solid: '#eab308' },
  rojo:    { border: '#ef4444', bg: 'rgba(239,68,68,0.08)', solid: '#ef4444' },
};

export default function SemaforosOverview() {
  const [datos, setDatos] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = getAccessToken() || localStorage.getItem('auth_token');
      const resp = await fetch(`${API_BASE}/dashboard/widgets/data/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ widgets: CARDS.map(c => c.key) })
      });
      const json = await resp.json();
      setDatos(json.data || {});
    } catch {
      setDatos({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
      gap: 12,
      marginBottom: 20
    }}>
      {loading ? (
        Array(4).fill(0).map((_, i) => (
          <div key={i} style={{
            height: 80,
            borderRadius: 12,
            background: 'var(--color-surface-card, #f3f4f6)',
            opacity: 0.6,
            animation: 'pulse 1.2s infinite',
          }} />
        ))
      ) : (
        CARDS.map(card => {
          const val = datos?.[card.key];
          const color = COLORS[card.getColor(val)];
          return (
            <div key={card.key} style={{
              display: 'flex',
              alignItems: 'center',
              borderRadius: 12,
              borderLeft: `4px solid ${color.border}`,
              background: color.bg,
              padding: '14px 16px',
              minHeight: 80,
              position: 'relative',
              color: 'var(--color-text)'
            }}>
              <div style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: color.solid,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 14,
                flexShrink: 0
              }}>
                <i className={`bi ${card.icon}`} style={{ color: '#fff', fontSize: 22 }}></i>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{card.format(val)}</span>
                  <span style={{ fontSize: '0.92rem', opacity: 0.85 }}>{card.title}</span>
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>{card.detail}</div>
              </div>
              <span style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: color.solid,
                boxShadow: `0 0 6px 1px ${color.solid}44`,
                marginLeft: 10,
                flexShrink: 0
              }} />
            </div>
          );
        })
      )}
    </div>
  );
}
