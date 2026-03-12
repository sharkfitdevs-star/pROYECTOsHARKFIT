import { useState } from 'react'
import PropTypes from 'prop-types'

// simple icon mapping by type
const TYPE_ICONS = {
  bar: '📊',
  line: '📈',
  area: '🗻',
  pie: '🥧',
  kpi_card: '🔢',
  heatmap: '🌡️',
  sparkline: '💠',
}

export default function HiddenWidgetsPanel({ hiddenWidgets, onRestore }) {
  const [open, setOpen] = useState(false)
  const count = hiddenWidgets.length
  return (
    <>
      <button
        className="hidden-widgets-trigger"
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed', bottom: '20px', right: '20px',
          background: '#2563eb', color: '#fff', border: 'none', borderRadius: '50%',
          width: '56px', height: '56px', cursor: 'pointer', zIndex: 100,
        }}
        title={`${count} widgets ocultos`}
      >
        🧩
        {count > 0 && (
          <span style={{
            position: 'absolute', top: '-4px', right: '-4px',
            background: '#f87171', color: '#fff', borderRadius: '50%',
            width: '20px', height: '20px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>{count}</span>
        )}
      </button>

      <div className={`hidden-widgets-panel ${open ? 'open' : ''}`}>
        <div style={{ padding: '1rem' }}>
          <h3 style={{ color: '#f1f5f9' }}>Widgets ocultos</h3>
          <button onClick={() => setOpen(false)} style={{ position: 'absolute', top: '8px', right: '8px', background: 'transparent', border: 'none', color: '#f1f5f9', fontSize: '1.25rem', cursor: 'pointer' }}>×</button>
          {hiddenWidgets.map(w => (
            <div key={w.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '8px 0', color: '#f1f5f9' }}>
              <div>{TYPE_ICONS[w.type] || '📌'} {w.title}</div>
              <button onClick={() => onRestore(w.id)} style={{ background: '#34d399', border: 'none', borderRadius: 4, padding: '4px 8px', color: '#000', cursor: 'pointer' }}>Restaurar</button>
            </div>
          ))}
          {hiddenWidgets.length === 0 && <p style={{ color: '#94a3b8' }}>No hay widgets ocultos</p>}
        </div>
      </div>

      <style>{`
        .hidden-widgets-panel {
          position: fixed;
          top: 0;
          right: -320px;
          width: 320px;
          height: 100%;
          background: #1e3a5f;
          box-shadow: -2px 0 8px rgba(0,0,0,0.3);
          transition: right 0.3s ease;
          z-index: 99;
        }
        .hidden-widgets-panel.open {
          right: 0;
        }
      `}</style>
    </>
  )
}

HiddenWidgetsPanel.propTypes = {
  hiddenWidgets: PropTypes.arrayOf(PropTypes.shape({ id: PropTypes.string.isRequired, title: PropTypes.string, type: PropTypes.string })).isRequired,
  onRestore: PropTypes.func.isRequired,
}
