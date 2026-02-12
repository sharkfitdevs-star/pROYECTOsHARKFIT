import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import '../../styles/Auth.css';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      await api.post('/auth/forgot-password', { email });
      setStatus({
        type: 'success',
        message: 'Si el email existe, se envio un enlace de recuperacion.'
      });
    } catch (error) {
      setStatus({
        type: 'error',
        message: 'No se pudo procesar la solicitud.'
      });
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
            <h2>Recuperar contraseña</h2>
            <p className="auth-subtitle">Ingresa tu email para recibir un enlace.</p>
          </div>

          {status && (
            <div className={`alert ${status.type === 'success' ? 'alert-success' : 'alert-error'}`}>
              <span className="alert-icon">{status.type === 'success' ? '✅' : '⚠️'}</span>
              <span>{status.message}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="tu@email.com"
                disabled={loading}
                required
              />
            </div>

            <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar enlace'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
