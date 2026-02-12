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
        // La redirección se maneja en el contexto
        console.log('✅ Autenticación exitosa');
        if (result.message) {
          setInfoMessage(result.message);
        }
      }
    } catch (error) {
      console.error('❌ Error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

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

  return (
    <div className="auth-container">
      <div className="auth-background">
        <div className="auth-background-overlay"></div>
      </div>

      <div className="auth-content">
        <div className="auth-card">
          {/* Logo y Header */}
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
          </div>
        </div>
      </div>
    </div>
  );
}
