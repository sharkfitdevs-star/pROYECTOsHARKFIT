import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/Auth.css';

// permitimos configurar la URL base mediante variable de entorno
const API_BASE = import.meta.env.VITE_API_URL || '/api';

function Register() {
  const navigate = useNavigate();
  // use english keys for API compatibility
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    password: '',
    confirm: ''
  });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  // estado para reglas de contraseña
  const [passwordRules, setPasswordRules] = useState({
    hasMinLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false
  });

  const validate = () => {
    const errs = {};
    if (!form.firstName) errs.firstName = 'Nombre es obligatorio';
    if (!form.lastName) errs.lastName = 'Apellido es obligatorio';
    if (!form.username) errs.username = 'Nombre de usuario es obligatorio';
    if (!form.email) errs.email = 'Correo es obligatorio';
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) errs.email = 'Correo inválido';

    // contraseña: mínimo 6, al menos una mayúscula, una minúscula y un número
    if (!form.password) errs.password = 'Contraseña es obligatoria';
    else {
      if (form.password.length < 6) {
        errs.password = 'Debe tener al menos 6 caracteres';
      } else if (!/[A-Z]/.test(form.password) || !/[a-z]/.test(form.password) || !/[0-9]/.test(form.password)) {
        errs.password = 'La contraseña debe incluir mayúsculas, minúsculas y números';
      }
    }

    if (form.password !== form.confirm) errs.confirm = 'Las contraseñas no coinciden';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));

    if (name === 'password') {
      setPasswordRules({
        hasMinLength: value.length >= 6,
        hasUppercase: /[A-Z]/.test(value),
        hasLowercase: /[a-z]/.test(value),
        hasNumber: /[0-9]/.test(value)
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          username: form.username,
          email: form.email,
          password: form.password
        })
      });
      const data = await res.json();
      if (!res.ok) {
        // campo específico devuelto por backend (ej. validación de password)
        if (data.fields && data.fields.password) {
          setErrors({ password: data.fields.password });
        } else {
          const msg = data.error || data.message || 'Error en registro';
          // manejar conflicto de usuario/email
          if (res.status === 409) {
            if (msg.toLowerCase().includes('username')) {
              setErrors({ username: msg });
            } else if (msg.toLowerCase().includes('email')) {
              setErrors({ email: msg });
            } else {
              setErrors({ server: msg });
            }
          } else {
            setErrors({ server: msg });
          }
        }
      } else {
        setMessage(data.message || 'Usuario registrado');
        setTimeout(() => navigate('/login'), 1500);
      }
    } catch (err) {
      setErrors({ server: 'Error de conexión' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-background">
        <div className="auth-background-overlay"></div>
      </div>

      <div className="auth-header-wrapper">
        <div className="auth-header-content">
          <div className="auth-logo">
            <h1>Sharcknegocios</h1>
          </div>
        </div>
      </div>

      <div className="auth-content">
        <div className="auth-card">
          <div className="auth-card-inner">
            <h2>Crear cuenta</h2>
            <p className="auth-subtitle">Regístrate para comenzar</p>
          </div>

          {message && <p style={{ color: 'green' }}>{message}</p>}
          {errors.server && <p style={{ color: 'red' }}>{errors.server}</p>}

          <form onSubmit={handleSubmit} className="auth-form">
            <div>
              <label>Nombre</label>
              <input name="firstName" value={form.firstName} onChange={handleChange} />
              {errors.firstName && <span style={{ color: 'red' }}>{errors.firstName}</span>}
            </div>
            <div>
              <label>Apellido</label>
              <input name="lastName" value={form.lastName} onChange={handleChange} />
              {errors.lastName && <span style={{ color: 'red' }}>{errors.lastName}</span>}
            </div>
            <div>
              <label>Nombre de usuario</label>
              <input name="username" value={form.username} onChange={handleChange} />
              {errors.username && <span style={{ color: 'red' }}>{errors.username}</span>}
            </div>
            <div>
              <label>Correo</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} />
              {errors.email && <span style={{ color: 'red' }}>{errors.email}</span>}
            </div>
            <div>
              <label>Contraseña</label>
              <input name="password" type="password" value={form.password} onChange={handleChange} />

              {/* mensaje de error proveniente del backend, si existe */}
              {errors.password && <span style={{ color: 'red', display: 'block' }}>{errors.password}</span>}

              {/* checklist dinámico de reglas */}
              <div className="password-rules">
                <p>Requisitos de contraseña:</p>
                <ul>
                  <li className={passwordRules.hasMinLength ? 'ok' : 'bad'}>Mínimo 6 caracteres</li>
                  <li className={passwordRules.hasUppercase ? 'ok' : 'bad'}>Incluye una letra mayúscula</li>
                  <li className={passwordRules.hasLowercase ? 'ok' : 'bad'}>Incluye una letra minúscula</li>
                  <li className={passwordRules.hasNumber ? 'ok' : 'bad'}>Incluye al menos un número</li>
                </ul>
              </div>
            </div>
            <div>
              <label>Confirmar contraseña</label>
              <input name="confirm" type="password" value={form.confirm} onChange={handleChange} />
              {errors.confirm && <span style={{ color: 'red' }}>{errors.confirm}</span>}
            </div>
            <button type="submit" disabled={loading}>
              {loading ? 'Registrando...' : 'Registrarse'}
            </button>
          </form>
          <p>
            ¿Ya tienes una cuenta?{' '}
            <span className="link" onClick={() => navigate('/login')} style={{ cursor: 'pointer', color: 'blue' }}>
              Inicia sesión
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;
