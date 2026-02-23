import { useNavigate } from "react-router-dom";
import "./Landing.css";

function Landing() {
  const navigate = useNavigate();

  return (
    <div className="landing-root">
      <header className="landing-navbar">
        <div className="landing-navbar-logo">Sharkfit</div>
        <nav className="landing-navbar-menu">
          <a href="#features">Features</a>
          <a href="#pricing">Ver precios</a>
          <a href="#contact">Contacto</a>
          <button
            className="landing-navbar-button"
            onClick={() => navigate('/login')}
          >
            Acceder
          </button>
        </nav>
      </header>

      <main className="landing-hero">
        <span className="landing-badge">Gestión Comercial Inteligente</span>
        <h1 className="landing-title">
          Todo lo que tu negocio necesita en un dashboard
        </h1>
        <p className="landing-subtitle">
          Controla clientes, ventas, alertas y reportes desde un solo lugar. Más
          productividad y decisiones inteligentes.
        </p>
        <div className="landing-actions">
          <button
            className="btn-primary"
            onClick={() => navigate('/login')}
          >
            Iniciar sesión
          </button>
          <button className="btn-secondary" onClick={() => navigate('/register')}>
            Registrarse
          </button>
        </div>
      </main>

      <section className="landing-stats">
        <div className="landing-stat-item">
          <span className="stat-number">500+</span>
          <span className="stat-label">clientes</span>
        </div>
        <div className="landing-stat-item">
          <span className="stat-number">10M+</span>
          <span className="stat-label">datos procesados</span>
        </div>
        <div className="landing-stat-item">
          <span className="stat-number">99.9%</span>
          <span className="stat-label">uptime</span>
        </div>
      </section>
    </div>
  );
}

export default Landing;
