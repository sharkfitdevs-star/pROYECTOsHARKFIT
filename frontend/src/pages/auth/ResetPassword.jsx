import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import '../../styles/Auth.css';

const useQuery = () => new URLSearchParams(useLocation().search);

export default function ResetPassword() {
  const navigate = useNavigate();
  const query = useQuery();
  const token = useMemo(() => query.get('token') || '', [query]);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!token) {
      setStatus({ type: 'error', message: 'Token invalido.' });
      return;
    }

    if (password.length < 8) {
      setStatus({ type: 'error', message: 'Usa al menos 8 caracteres.' });
      return;
    }

    if (password !== confirm) {
      setStatus({ type: 'error', message: 'Las contraseñas no coinciden.' });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      await api.post('/auth/reset-password', {
        token,
        newPassword: password
      });
      setStatus({ type: 'success', message: 'Contraseña actualizada. Ya puedes iniciar sesion.' });
      setPassword('');
      setConfirm('');
    } catch (error) {
      setStatus({ type: 'error', message: 'No se pudo actualizar la contraseña.' });
    } finally {
      setLoading(false);
    }
  };

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
            <h2>Restablecer contraseña</h2>
            <p className="auth-subtitle">Define una nueva contraseña segura.</p>
          </div>

          {status && (
            <div className={`alert ${status.type === 'success' ? 'alert-success' : 'alert-error'}`}>
              <span className="alert-icon">{status.type === 'success' ? '✅' : '⚠️'}</span>
              <span>{status.message}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="password">Nueva contraseña</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirm">Confirmar contraseña</label>
              <input
                type="password"
                id="confirm"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                placeholder="••••••••"
                disabled={loading}
              />
            </div>

            <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar contraseña'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
