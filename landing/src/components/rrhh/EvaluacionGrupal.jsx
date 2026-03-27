import React, { useState } from 'react';

const CRITERIOS_DEFAULT = [
  { nombre: 'Puntualidad', peso: 15 },
  { nombre: 'Desempeño', peso: 25 },
  { nombre: 'Trabajo en equipo', peso: 20 },
  { nombre: 'Iniciativa', peso: 15 },
  { nombre: 'Comunicación', peso: 15 },
  { nombre: 'Objetivos', peso: 10 },
];

function getColabId(colab) {
  return colab.id || colab._id || colab.rut || colab.email || `${colab.nombre}_${colab.apellido}`;
}

function getBadge(total) {
  if (total > 4.5) return { text: 'Excelente', bg: '#22c55e', color: '#fff' };
  if (total > 3.5) return { text: 'Bueno', bg: '#2563eb', color: '#fff' };
  if (total > 2.5) return { text: 'Regular', bg: '#facc15', color: '#222' };
  return { text: 'Deficiente', bg: '#ef4444', color: '#fff' };
}

export default function EvaluacionGrupal({ colaboradores = [] }) {
  const [criterios] = useState(CRITERIOS_DEFAULT);
  const [puntajes, setPuntajes] = useState({});
  const [seleccionados, setSeleccionados] = useState([]);

  const handleCheck = (id) => {
    setSeleccionados(sel => sel.includes(id) ? sel.filter(x => x !== id) : [...sel, id]);
  };

  const handleInput = (colabId, critIdx, val) => {
    setPuntajes(prev => ({
      ...prev,
      [colabId]: { ...prev[colabId], [critIdx]: val }
    }));
  };

  const getTotal = (colabId) => {
    const p = puntajes[colabId] || {};
    return criterios.reduce((sum, c, i) => sum + ((Number(p[i]) || 0) * c.peso / 100), 0).toFixed(2);
  };

  // Promedio por criterio
  const promedios = criterios.map((c, i) => {
    const vals = seleccionados.map(cid => Number(puntajes[cid]?.[i]) || 0).filter(v => v > 0);
    if (!vals.length) return '';
    return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2);
  });
  // Promedio total
  const promedioTotal = (() => {
    const vals = seleccionados.map(cid => Number(getTotal(cid)) || 0).filter(v => v > 0);
    if (!vals.length) return '';
    return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2);
  })();

  return (
    <div style={{ margin: '24px 0' }}>
      <div style={{ marginBottom: 16 }}>
        <strong>Selecciona colaboradores a evaluar:</strong>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 8 }}>
          {colaboradores.map(colab => {
            const id = getColabId(colab);
            return (
              <label key={id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
                <input type="checkbox" checked={seleccionados.includes(id)} onChange={() => handleCheck(id)} />
                {colab.nombre} {colab.apellido}
              </label>
            );
          })}
        </div>
      </div>
      {seleccionados.length > 0 && (
        <div style={{ overflowX: 'auto', marginTop: 18 }}>
          <table style={{ borderCollapse: 'collapse', fontSize: '0.85rem', width: '100%', minWidth: 700 }}>
            <thead>
              <tr>
                <th style={{ background: 'var(--color-surface-card)', padding: '8px 12px' }}>Colaborador</th>
                {criterios.map((c, i) => (
                  <th key={i} style={{ background: 'var(--color-surface-card)', padding: '8px 12px' }}>{c.nombre} <span style={{ color: '#888', fontWeight: 400 }}>({c.peso}%)</span></th>
                ))}
                <th style={{ background: 'var(--color-surface-card)', padding: '8px 12px' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {seleccionados.map(cid => {
                const colab = colaboradores.find(c => getColabId(c) === cid);
                const total = Number(getTotal(cid));
                const badge = getBadge(total);
                return (
                  <tr key={cid}>
                    <td style={{ padding: '6px 10px', borderBottom: '1px solid var(--color-border)' }}>{colab?.nombre} {colab?.apellido}</td>
                    {criterios.map((c, i) => (
                      <td key={i} style={{ padding: '6px 10px', borderBottom: '1px solid var(--color-border)' }}>
                        <input
                          type="number"
                          min={1}
                          max={5}
                          step={0.5}
                          value={puntajes[cid]?.[i] ?? ''}
                          onChange={e => handleInput(cid, i, e.target.value)}
                          style={{ width: 60, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 4, color: 'var(--color-text)', textAlign: 'center' }}
                        />
                      </td>
                    ))}
                    <td style={{ padding: '6px 10px', borderBottom: '1px solid var(--color-border)' }}>
                      <span style={{ background: badge.bg, color: badge.color, borderRadius: 8, padding: '2px 10px', fontWeight: 600, fontSize: 13 }}>
                        {getTotal(cid)} {badge.text}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td style={{ padding: '6px 10px', fontWeight: 600 }}>Promedio</td>
                {promedios.map((p, i) => (
                  <td key={i} style={{ padding: '6px 10px', fontWeight: 600 }}>{p}</td>
                ))}
                <td style={{ padding: '6px 10px', fontWeight: 600 }}>{promedioTotal}</td>
              </tr>
            </tfoot>
          </table>
          <div style={{ marginTop: 18 }}>
            <button
              onClick={() => console.log('Evaluación grupal:', { criterios, puntajes, seleccionados })}
              style={{ background: 'var(--color-primary-light, #6366f1)', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 22px', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}
            >
              Guardar evaluación
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
