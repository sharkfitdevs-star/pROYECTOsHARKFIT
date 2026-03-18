import React from 'react';
import { useToast, dismiss } from './use-toast';

const styles = {
  container: {
    position: 'fixed',
    top: 16,
    right: 16,
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    maxWidth: 360
  },
  toast: {
    background: '#111827',
    color: '#fff',
    padding: '12px 14px',
    borderRadius: 10,
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)'
  },
  title: {
    fontWeight: 700,
    fontSize: 14,
    marginBottom: 4
  },
  description: {
    fontSize: 13,
    opacity: 0.9
  },
  success: {
    background: '#065f46'
  },
  error: {
    background: '#991b1b'
  },
  warning: {
    background: '#92400e'
  },
  action: {
    marginTop: 8,
    background: 'transparent',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.4)',
    padding: '6px 8px',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 12
  },
  actionRow: {
    marginTop: 8,
    display: 'flex',
    gap: 6,
    flexWrap: 'wrap'
  }
};

export default function Toaster() {
  const { toasts } = useToast();

  return (
    <div style={styles.container}>
      {toasts.map((t) => (
        <div
          key={t.id}
          style={{
            ...styles.toast,
            ...(t.variant === 'success' ? styles.success : null),
            ...(t.variant === 'error' ? styles.error : null),
            ...(t.variant === 'warning' ? styles.warning : null)
          }}
        >
          {t.title && <div style={styles.title}>{t.title}</div>}
          {t.description && <div style={styles.description}>{t.description}</div>}
          {Array.isArray(t.actions) && t.actions.length > 0 && (
            <div style={styles.actionRow}>
              {t.actions.map((action, idx) => (
                <button
                  key={`${t.id}-action-${idx}`}
                  style={styles.action}
                  onClick={() => {
                    try {
                      if (typeof action.onClick === 'function') action.onClick();
                    } finally {
                      if (action.dismissOnClick !== false) dismiss(t.id);
                    }
                  }}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
          <button style={styles.action} onClick={() => dismiss(t.id)}>
            Cerrar
          </button>
        </div>
      ))}
    </div>
  );
}
