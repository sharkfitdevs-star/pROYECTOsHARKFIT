import React, { useState } from 'react';

export default function FichaColaborador({ colaborador, visible, onClose }) {
  const [tab, setTab] = useState('datos');
  if (!visible || !colaborador) return null;

  const estadoActivo = colaborador.estado === 'activo';
  const formatCLP = (v) =>
    typeof v === 'number'
      ? new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(v)
      : v;
  const formatDate = (d) => {
    if (!d) return '';
    try {
      return new Date(d).toLocaleDateString('es-CL');
    } catch {
      return d;
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'rgba(0,0,0,0.5)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: 700,
          maxHeight: '80vh',
          overflowY: 'auto',
          borderRadius: 12,
          background: 'var(--color-surface-card, #fff)',
          color: 'var(--color-text, #222)',
          padding: 0,
        }}
      >
        {/* HEADER */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--color-border, #eee)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
              {colaborador.nombre} {colaborador.apellido}
            </h2>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary, #888)' }}>
              {colaborador.cargo}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span
              style={{
                background: estadoActivo
                  ? 'rgba(34,197,94,0.15)'
                  : 'rgba(239,68,68,0.15)',
                color: estadoActivo ? '#22c55e' : '#ef4444',
                padding: '4px 12px',
                borderRadius: 20,
                fontSize: '0.78rem',
                fontWeight: 600,
                marginRight: 10,
              }}
            >
              {estadoActivo ? 'Activo' : 'Inactivo'}
            </span>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '1.3rem',
                cursor: 'pointer',
                color: 'var(--color-text-secondary, #888)',
              }}
              aria-label="Cerrar"
            >
              ×
            </button>
          </div>
        </div>
        {/* TABS */}
        <div
          style={{
            padding: '0 24px',
            borderBottom: '1px solid var(--color-border, #eee)',
            display: 'flex',
            gap: 0,
          }}
        >
          {['datos', 'cargo', 'remuneracion', 'historial'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                background: 'none',
                border: 'none',
                padding: '12px 20px',
                fontSize: '0.85rem',
                cursor: 'pointer',
                borderBottom:
                  tab === t
                    ? '2px solid var(--color-primary-light, #6366f1)'
                    : '2px solid transparent',
                color:
                  tab === t
                    ? 'var(--color-primary-light, #6366f1)'
                    : 'var(--color-text-secondary, #888)',
                fontWeight: tab === t ? 600 : 400,
              }}
            >
              {t === 'datos'
                ? 'Datos'
                : t === 'cargo'
                ? 'Cargo'
                : t === 'remuneracion'
                ? 'Remuneración'
                : 'Historial'}
            </button>
          ))}
        </div>
        {/* TAB CONTENT */}
        <div style={{ padding: 24 }}>
          {tab === 'datos' && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 16,
              }}
            >
              <div>
                <span style={labelStyle}>Nombre</span>
                <span style={valueStyle}>{colaborador.nombre}</span>
              </div>
              <div>
                <span style={labelStyle}>Apellido</span>
                <span style={valueStyle}>{colaborador.apellido}</span>
              </div>
              <div>
                <span style={labelStyle}>RUT</span>
                <span style={valueStyle}>{colaborador.rut}</span>
              </div>
              <div>
                <span style={labelStyle}>Email</span>
                <span style={valueStyle}>{colaborador.email}</span>
              </div>
              <div>
                <span style={labelStyle}>Teléfono</span>
                <span style={valueStyle}>{colaborador.telefono}</span>
              </div>
              <div>
                <span style={labelStyle}>Fecha nacimiento</span>
                <span style={valueStyle}>{formatDate(colaborador.fecha_nacimiento)}</span>
              </div>
              <div>
                <span style={labelStyle}>Género</span>
                <span style={valueStyle}>{colaborador.genero}</span>
              </div>
              <div>
                <span style={labelStyle}>Nacionalidad</span>
                <span style={valueStyle}>{colaborador.nacionalidad}</span>
              </div>
              <div>
                <span style={labelStyle}>Estado civil</span>
                <span style={valueStyle}>{colaborador.estado_civil}</span>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <span style={labelStyle}>Dirección</span>
                <span style={valueStyle}>{colaborador.direccion}</span>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <span style={labelStyle}>Contacto emergencia</span>
                <span style={valueStyle}>{colaborador.contacto_emergencia}</span>
              </div>
            </div>
          )}
          {tab === 'cargo' && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 16,
              }}
            >
              <div>
                <span style={labelStyle}>Cargo</span>
                <span style={valueStyle}>{colaborador.cargo}</span>
              </div>
              <div>
                <span style={labelStyle}>Departamento</span>
                <span style={valueStyle}>{colaborador.departamento}</span>
              </div>
              <div>
                <span style={labelStyle}>Fecha ingreso</span>
                <span style={valueStyle}>{formatDate(colaborador.fecha_ingreso)}</span>
              </div>
              <div>
                <span style={labelStyle}>Tipo contrato</span>
                <span style={valueStyle}>{colaborador.tipo_contrato}</span>
              </div>
              <div>
                <span style={labelStyle}>Jornada</span>
                <span style={valueStyle}>{colaborador.jornada}</span>
              </div>
              <div>
                <span style={labelStyle}>Sede</span>
                <span style={valueStyle}>{colaborador.idBranch}</span>
              </div>
            </div>
          )}
          {tab === 'remuneracion' && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 16,
              }}
            >
              <div>
                <span style={labelStyle}>Sueldo base</span>
                <span style={valueStyle}>{formatCLP(colaborador.sueldo_base)}</span>
              </div>
              <div>
                <span style={labelStyle}>Bonos</span>
                <span style={valueStyle}>{formatCLP(colaborador.bonos)}</span>
              </div>
              <div>
                <span style={labelStyle}>AFP</span>
                <span style={valueStyle}>{colaborador.afp}</span>
              </div>
              <div>
                <span style={labelStyle}>Previsión salud</span>
                <span style={valueStyle}>{colaborador.prevision_salud}</span>
              </div>
              <div>
                <span style={labelStyle}>Banco</span>
                <span style={valueStyle}>{colaborador.banco}</span>
              </div>
            </div>
          )}
          {tab === 'historial' && (
            <div style={{ textAlign: 'center', padding: 32 }}>
              <i
                className="bi bi-clock-history"
                style={{ fontSize: '2rem', color: 'var(--color-text-secondary, #888)' }}
              />
              <div style={{ fontSize: '0.85rem', marginTop: 12, color: 'var(--color-text-secondary, #888)' }}>
                Historial de evaluaciones - próximamente
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const labelStyle = {
  display: 'block',
  fontSize: '0.72rem',
  color: 'var(--color-text-secondary, #888)',
  marginBottom: 2,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
};
const valueStyle = {
  fontSize: '0.9rem',
  fontWeight: 500,
  color: 'var(--color-text, #222)',
};
