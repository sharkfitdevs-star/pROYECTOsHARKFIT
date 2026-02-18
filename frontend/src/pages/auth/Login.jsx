/**
 * PÁGINA: Login y Registro
 * Interfaz moderna para autenticación de usuarios
 */

import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import '../../styles/Auth.css';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    identifier: '',
    email: '',
    username: '',
    firstName: '',
    lastName: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [infoMessage, setInfoMessage] = useState('');
  
  const { login, register, error: authError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const mode = useMemo(() => new URLSearchParams(location.search).get('mode'), [location.search]);

  useEffect(() => {
    if (mode === 'register') {
      setIsLogin(false);
    } else if (mode === 'login') {
      setIsLogin(true);
    }
  }, [mode]);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Limpiar error del campo cuando el usuario escribe
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }

    if (infoMessage) {
      setInfoMessage('');
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (isLogin) {
      if (!formData.identifier) {
        newErrors.identifier = 'Email o usuario requerido';
      }
    } else {
      if (!formData.firstName) {
        newErrors.firstName = 'El nombre es requerido';
      }
      if (!formData.lastName) {
        newErrors.lastName = 'El apellido es requerido';
      }
      if (!formData.username) {
        newErrors.username = 'El usuario es requerido';
      } else if (!/^[a-zA-Z0-9._-]{3,30}$/.test(formData.username)) {
        newErrors.username = 'Usuario inválido — solo letras, números, puntos, guiones o guion bajo (3-30 caracteres)';
      }
      if (!formData.email) {
        newErrors.email = 'El email es requerido';
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = 'Email inválido';
      }
      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'Confirma tu contraseña';
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Las contraseñas no coinciden';
      }
    }

    if (!formData.password) {
      newErrors.password = 'La contraseña es requerida';
    } else if (formData.password.length < 8) {
      newErrors.password = 'La contraseña debe tener al menos 8 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      let result;
      
      if (isLogin) {
        result = await login(formData.identifier, formData.password);
      } else {
        result = await register({
          firstName: formData.firstName,
          lastName: formData.lastName,
          username: formData.username,
          email: formData.email,
          password: formData.password
        });
      }

      if (result.success) {
        console.log('✅ Autenticación exitosa, redirigiendo...');
        if (result.message) {
          setInfoMessage(result.message);
        }
      } else {
        // Si hay error en el resultado, ya está manejado por el context
        console.error('❌ Autenticación falló:', result.error);
      }
    } catch (error) {
      console.error('❌ Error inesperado:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestData, setRequestData] = useState({ firstName: '', lastName: '', email: '', company: '', message: '' });
  const [requestStatus, setRequestStatus] = useState(null);

  const toggleMode = () => {
    const nextIsLogin = !isLogin;
    setIsLogin(nextIsLogin);
    navigate(`/login?mode=${nextIsLogin ? 'login' : 'register'}`, { replace: true });
    setFormData({
      identifier: '',
      email: '',
      username: '',
      firstName: '',
      lastName: '',
      password: '',
      confirmPassword: ''
    });
    setErrors({});
    setInfoMessage('');
  };

  const handleRequestChange = (e) => {
    const { name, value } = e.target;
    setRequestData(prev => ({ ...prev, [name]: value }));
  };

  const submitRequestAccess = async (e) => {
    e.preventDefault();
    setRequestStatus(null);

    if (!requestData.firstName || !requestData.lastName || !requestData.email) {
      setRequestStatus({ error: true, message: 'Nombre, apellido y email son requeridos' });
      return;
    }

    try {
      const usuarios = await import('../../api/services/usuariosService').then(m => m.default);
      const result = await usuarios.requestAccess(requestData);
      if (result && result.success) {
        setRequestStatus({ success: true, message: 'Solicitud enviada. Te avisaremos por email.' });
        setShowRequestForm(false);
        setRequestData({ firstName: '', lastName: '', email: '', company: '', message: '' });
      } else {
        setRequestStatus({ error: true, message: result?.message || 'Error al enviar solicitud' });
      }
    } catch (err) {
      setRequestStatus({ error: true, message: err?.response?.data?.message || 'Error enviando solicitud' });
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-background">
        <div className="auth-background-overlay"></div>
      </div>

      {/* Header Morado Principal */}
      <div className="auth-header-wrapper">
        <div className="auth-header-content">
          <div className="auth-logo">
            <span className="logo-icon">🦈</span>
            <h1>SharkFit</h1>
          </div>
        </div>
      </div>

      <div className="auth-content">
        <div className="auth-card">
          {/* Contenido de la tarjeta */}
          <div className="auth-card-inner">
            <button 
              type="button" 
              onClick={handleBack}
              className="btn-back"
              title="Volver"
            >
              ← Atrás
            </button>
            <h2>{isLogin ? 'Bienvenido de vuelta' : 'Crear cuenta'}</h2>
            <p className="auth-subtitle">
              {isLogin 
                ? 'Ingresa tus credenciales para acceder' 
                : 'Completa el formulario para registrarte'}
            </p>
          </div>

          {/* Mensaje informativo */}
          {infoMessage && (
            <div className="alert alert-success">
              <span className="alert-icon">✅</span>
              <span>{infoMessage}</span>
            </div>
          )}

          {/* Errores generales */}
          {authError && (
            <div className="alert alert-error">
              <span className="alert-icon">⚠️</span>
              <span>{authError}</span>

              {/* Ayuda contextual cuando el backend deshabilita el registro público */}
              {(authError || '').toLowerCase().includes('registro público deshabilitado') || (authError || '').toLowerCase().includes('registro deshabilitado') ? (
                <div className="auth-error-help" style={{marginTop:8, fontSize:12, color:'#e6e6e6'}}>
                  <div>Si estás en desarrollo puedes habilitar el registro en el backend o crear el primer usuario:</div>
                  <code style={{display:'block', marginTop:6}}>cd backend-data-intake && npm run create-owner</code>
                </div>
              ) : null}
            </div>
          )}

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="auth-form">
            {/* Campo Nombre (solo registro) */}
            {!isLogin && (
              <div className="form-group">
                <label htmlFor="firstName">Nombre</label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className={errors.firstName ? 'error' : ''}
                  placeholder="Juan"
                  disabled={isSubmitting}
                />
                {errors.firstName && (
                  <span className="error-message">{errors.firstName}</span>
                )}
              </div>
            )}

            {!isLogin && (
              <div className="form-group">
                <label htmlFor="lastName">Apellido</label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className={errors.lastName ? 'error' : ''}
                  placeholder="Pérez"
                  disabled={isSubmitting}
                />
                {errors.lastName && (
                  <span className="error-message">{errors.lastName}</span>
                )}
              </div>
            )}

            {!isLogin && (
              <div className="form-group">
                <label htmlFor="username">Usuario</label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className={errors.username ? 'error' : ''}
                  placeholder="juan.perez"
                  disabled={isSubmitting}
                  autoComplete="username"
                />
                {errors.username && (
                  <span className="error-message">{errors.username}</span>
                )}
              </div>
            )}

            {/* Campo Email/Usuario */}
            {isLogin ? (
              <div className="form-group">
                <label htmlFor="identifier">Email o usuario</label>
                <input
                  type="text"
                  id="identifier"
                  name="identifier"
                  value={formData.identifier}
                  onChange={handleChange}
                  className={errors.identifier ? 'error' : ''}
                  placeholder="tu@email.com"
                  disabled={isSubmitting}
                  autoComplete="username"
                />
                {errors.identifier && (
                  <span className="error-message">{errors.identifier}</span>
                )}
              </div>
            ) : (
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={errors.email ? 'error' : ''}
                  placeholder="tu@email.com"
                  disabled={isSubmitting}
                  autoComplete="email"
                />
                {errors.email && (
                  <span className="error-message">{errors.email}</span>
                )}
              </div>
            )}

            {/* Campo Contraseña */}
            <div className="form-group">
              <label htmlFor="password">Contraseña</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={errors.password ? 'error' : ''}
                placeholder="••••••••"
                disabled={isSubmitting}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
              />
              {errors.password && (
                <span className="error-message">{errors.password}</span>
              )}
            </div>

            {/* Confirmar Contraseña (solo registro) */}
            {!isLogin && (
              <div className="form-group">
                <label htmlFor="confirmPassword">Confirmar contraseña</label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={errors.confirmPassword ? 'error' : ''}
                  placeholder="••••••••"
                  disabled={isSubmitting}
                  autoComplete="new-password"
                />
                {errors.confirmPassword && (
                  <span className="error-message">{errors.confirmPassword}</span>
                )}
              </div>
            )}

            {/* Olvidé mi contraseña (solo login) */}
            {isLogin && (
              <div className="form-footer">
                <Link to="/forgot-password" className="forgot-password-link">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
            )}

            {/* Botón Submit */}
            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="spinner-small"></span>
                  <span>{isLogin ? 'Iniciando sesión...' : 'Registrando...'}</span>
                </>
              ) : (
                <span>{isLogin ? 'Iniciar sesión' : 'Crear cuenta'}</span>
              )}
            </button>
          </form>

          {/* Toggle Login/Register */}
          <div className="auth-toggle">
            <p>
              {isLogin ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}
              {' '}
              <button
                type="button"
                onClick={toggleMode}
                className="toggle-button"
                disabled={isSubmitting}
              >
                {isLogin ? 'Regístrate aquí' : 'Inicia sesión'}
              </button>
            </p>

            {/* Solicitud de acceso (si no quieres registro público) */}
            <p style={{marginTop:8}}>
              <button
                type="button"
                onClick={() => { setShowRequestForm(s => !s); setRequestStatus(null); }}
                className="toggle-button"
                disabled={isSubmitting}
              >
                Solicitar acceso
              </button>
            </p>

            {showRequestForm && (
              <form onSubmit={submitRequestAccess} className="auth-form" style={{marginTop:12, padding:12, borderRadius:8, background:'#fff'}}>
                {requestStatus && (
                  <div className={requestStatus.error ? 'alert alert-error' : 'alert alert-success'} style={{marginBottom:8}}>
                    <span>{requestStatus.message}</span>
                  </div>
                )}

                <div className="form-group">
                  <label>Nombre</label>
                  <input name="firstName" value={requestData.firstName} onChange={handleRequestChange} />
                </div>
                <div className="form-group">
                  <label>Apellido</label>
                  <input name="lastName" value={requestData.lastName} onChange={handleRequestChange} />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input name="email" value={requestData.email} onChange={handleRequestChange} />
                </div>
                <div className="form-group">
                  <label>Empresa (opcional)</label>
                  <input name="company" value={requestData.company} onChange={handleRequestChange} />
                </div>
                <div className="form-group">
                  <label>Mensaje (opcional)</label>
                  <textarea name="message" value={requestData.message} onChange={handleRequestChange} rows={3} />
                </div>

                <div style={{display:'flex', gap:8}}>
                  <button type="submit" className="btn btn-primary">Enviar solicitud</button>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowRequestForm(false)}>Cancelar</button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
