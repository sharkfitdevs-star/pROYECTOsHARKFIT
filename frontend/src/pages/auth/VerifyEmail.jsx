import { useEffect, useMemo, useState } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import '../../styles/Auth.css';

const useQuery = () => new URLSearchParams(useLocation().search);

export default function VerifyEmail() {
  const navigate = useNavigate();
  const query = useQuery();
  const token = useMemo(() => query.get('token') || '', [query]);
  const [status, setStatus] = useState({ type: 'loading', message: 'Verificando...' });

  useEffect(() => {
    if (!token) {
      setStatus({ type: 'error', message: 'Token invalido.' });
      return;
    }

    api.post('/auth/verify-email', { token })
      .then(() => {
        setStatus({ type: 'success', message: 'Email verificado. Ya puedes iniciar sesion.' });
      })
      .catch(() => {
        setStatus({ type: 'error', message: 'No se pudo verificar el email.' });
      });
  }, [token]);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-background">
        <div className="auth-background-overlay"></div>
      </div>

      <div className="auth-content">
        <div className="auth-card">
          <div className="auth-header">
            <button 
              type="button" 
              onClick={handleBack}
              className="btn-back"
              title="Volver"
            >
              ← Atrás
            </button>
            <div className="auth-logo">
              <span className="logo-icon">🦈</span>
              <h1>SharkFit</h1>
            </div>
            <h2>Verificacion de email</h2>
            <p className="auth-subtitle">Estado de tu cuenta</p>
          </div>

          <div className={`alert ${status.type === 'success' ? 'alert-success' : status.type === 'error' ? 'alert-error' : ''}`}>
            <span className="alert-icon">{status.type === 'success' ? '✅' : status.type === 'error' ? '⚠️' : '⏳'}</span>
            <span>{status.message}</span>
          </div>

          <div className="auth-toggle">
            <Link to="/login" className="btn btn-primary btn-block">
              Ir al login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
