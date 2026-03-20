import { useEffect, useState, useRef, useCallback } from 'react';
import { getAccessToken } from '../config/authStorage';

const WARNING_BEFORE_MS = 2 * 60 * 1000;  // 2 min antes de expirar
const CHECK_INTERVAL_MS = 30 * 1000;       // revisar cada 30s

function getTokenExpiry(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

export default function SessionWarning({ onExtend, onLogout }) {
  const [visible, setVisible]       = useState(false);
  const [countdown, setCountdown]   = useState(120);
  const [isExtending, setIsExtending] = useState(false);
  const countdownRef                = useRef(null);
  const checkRef                    = useRef(null);

  const startCountdown = useCallback(() => {
    setCountdown(120);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current);
          // tiempo agotado — dejar que el interceptor maneje el 401
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    const check = () => {
      const token = getAccessToken();
      if (!token) return;
      const expiry = getTokenExpiry(token);
      if (!expiry) return;
      const remaining = expiry - Date.now();
      if (remaining > 0 && remaining <= WARNING_BEFORE_MS && !visible) {
        setVisible(true);
        startCountdown();
      }
      if (remaining <= 0) {
        setVisible(false);
      }
    };

    check();
    checkRef.current = setInterval(check, CHECK_INTERVAL_MS);
    return () => {
      clearInterval(checkRef.current);
      clearInterval(countdownRef.current);
    };
  }, [visible, startCountdown]);

  const handleExtend = async () => {
    if (isExtending) return;
    setIsExtending(true);
    setVisible(false);
    clearInterval(countdownRef.current);
    setCountdown(120);
    try {
      if (onExtend) await onExtend();
    } catch {
      // si falla, el interceptor de auth gestiona expiracion y redireccion
    } finally {
      setIsExtending(false);
    }
  };

  const handleLogout = () => {
    setVisible(false);
    clearInterval(countdownRef.current);
    if (onLogout) onLogout();
  };

  if (!visible) return null;

  const mins = Math.floor(countdown / 60);
  const secs = String(countdown % 60).padStart(2, '0');

  return (
    <>
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          background: '#1e293b', borderRadius: '14px',
          padding: '2rem', maxWidth: '380px', width: '90%',
          border: '1px solid rgba(251,191,36,0.4)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>⏳</div>
          <h3 style={{ color: '#f1f5f9', margin: '0 0 0.5rem', fontSize: '1.1rem', fontWeight: 700 }}>
            ¿Sigues ahí?
          </h3>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: '0 0 1.25rem', lineHeight: 1.5 }}>
            Tu sesión expirará en{' '}
            <strong style={{ color: '#fbbf24' }}>
              {mins > 0 ? `${mins}:${secs}` : `${countdown}s`}
            </strong>
            . ¿Deseas continuar?
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button
              onClick={handleLogout}
              style={{
                padding: '9px 18px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)',
                background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: '0.875rem',
              }}
            >
              Cerrar sesión
            </button>
            <button
              onClick={handleExtend}
              disabled={isExtending}
              style={{
                padding: '9px 20px', borderRadius: '8px', border: 'none',
                background: '#fbbf24', color: '#000', cursor: 'pointer',
                fontSize: '0.875rem', fontWeight: 700,
                opacity: isExtending ? 0.7 : 1,
              }}
            >
              Sí, continuar
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
