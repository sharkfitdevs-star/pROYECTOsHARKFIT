import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import '../../styles/Auth.css';

export default function Account() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '' });
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadSessions = async () => {
    try {
      const response = await api.get('/auth/sessions');
      setSessions(response.data.data || []);
    } catch (error) {
      setSessions([]);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const handlePasswordChange = async (event) => {
    event.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      await api.post('/auth/change-password', passwords);
      setStatus({ type: 'success', message: 'Contraseña actualizada. Inicia sesion nuevamente.' });
      setPasswords({ currentPassword: '', newPassword: '' });
    } catch (error) {
      setStatus({ type: 'error', message: 'No se pudo cambiar la contraseña.' });
    } finally {
      setLoading(false);
    }
  };

  const closeSession = async (sessionId) => {
    await api.delete(`/auth/sessions/${sessionId}`);
    loadSessions();
  };

  const closeAllSessions = async () => {
    await api.delete('/auth/sessions');
    loadSessions();
  };

  return (
    <div className="auth-container">
      <div className="auth-background">
        <div className="auth-background-overlay"></div>
      </div>

      <div className="auth-content">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-logo">
              <span className="logo-icon">🦈</span>
              <h1>SharkFit</h1>
            </div>
            <h2>Mi cuenta</h2>
            <p className="auth-subtitle">Gestiona tu perfil y sesiones</p>
          </div>

          <div className="demo-credentials">
            <p className="demo-title">Usuario</p>
            <p className="demo-text">
              {user?.firstName || user?.username || 'Usuario'}<br />
              {user?.email || ''}<br />
              Rol: {user?.role || 'staff'}
            </p>
          </div>

          {status && (
            <div className={`alert ${status.type === 'success' ? 'alert-success' : 'alert-error'}`}>
              <span className="alert-icon">{status.type === 'success' ? '✅' : '⚠️'}</span>
              <span>{status.message}</span>
            </div>
          )}

          <form onSubmit={handlePasswordChange} className="auth-form">
            <div className="form-group">
              <label htmlFor="currentPassword">Contraseña actual</label>
              <input
                type="password"
                id="currentPassword"
                value={passwords.currentPassword}
                onChange={(event) => setPasswords({ ...passwords, currentPassword: event.target.value })}
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label htmlFor="newPassword">Nueva contraseña</label>
              <input
                type="password"
                id="newPassword"
                value={passwords.newPassword}
                onChange={(event) => setPasswords({ ...passwords, newPassword: event.target.value })}
                disabled={loading}
              />
            </div>
            <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
              {loading ? 'Actualizando...' : 'Cambiar contraseña'}
            </button>
          </form>

          <div className="auth-toggle">
            <p>Sesiones activas</p>
          </div>

          <div className="demo-credentials">
            {sessions.length === 0 ? (
              <p className="demo-text">No hay sesiones activas.</p>
            ) : (
              sessions.map((session) => (
                <div key={session.id} className="status-item">
                  <span className="status-label">{session.ip || 'IP desconocida'}</span>
                  <span className="status-badge success">
                    {new Date(session.createdAt).toLocaleString()}
                  </span>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => closeSession(session.id)}
                  >
                    Cerrar
                  </button>
                </div>
              ))
            )}

            {sessions.length > 0 && (
              <button type="button" className="btn btn-secondary" onClick={closeAllSessions}>
                Cerrar todas las sesiones
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
