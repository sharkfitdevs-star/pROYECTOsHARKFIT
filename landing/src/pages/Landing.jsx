import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import './Landing.css';

const stats = [
  { value: '500+', label: 'Clientes' },
  { value: '10K+', label: 'Ventas' },
  { value: '99.9%', label: 'Uptime' },
  { value: '24/7', label: 'Soporte' },
];

const features = [
  {
    icon: '◌',
    title: 'Datos en tiempo real',
    description: 'Monitorea clientes, operaciones y rendimiento comercial con una vista viva y accionable.',
  },
  {
    icon: '◎',
    title: 'Integracion con EVO',
    description: 'Conecta tus fuentes clave y centraliza la operacion sin friccion ni procesos manuales repetitivos.',
  },
  {
    icon: '✦',
    title: 'Reportes inteligentes',
    description: 'Detecta patrones, oportunidades y alertas relevantes con reportes claros para tomar mejores decisiones.',
  },
];

const pricingCards = [
  {
    name: 'Starter',
    price: 'Gratis',
    description: 'Ideal para explorar SharkFit y ordenar la operacion inicial.',
    items: ['Dashboard unificado', 'Metricas esenciales', 'Soporte por email'],
  },
  {
    name: 'Growth',
    price: 'Escalable',
    description: 'Pensado para equipos que necesitan velocidad, visibilidad y control.',
    items: ['Integracion con EVO', 'Reportes avanzados', 'Alertas automatizadas'],
  },
];

function Landing() {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 12);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSectionNavigation = (sectionId) => {
    setIsMenuOpen(false);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="landing-root">
      <header className={`landing-navbar${isScrolled ? ' is-scrolled' : ''}`}>
        <div className="landing-navbar-shell">
          <button
            type="button"
            className="landing-navbar-logo"
            onClick={() => handleSectionNavigation('hero')}
            aria-label="Ir al inicio"
          >
            SharkFit
          </button>

          <button
            type="button"
            className={`landing-menu-toggle${isMenuOpen ? ' is-open' : ''}`}
            aria-expanded={isMenuOpen}
            aria-label="Abrir menu"
            onClick={() => setIsMenuOpen((current) => !current)}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>

          <div className={`landing-navbar-panel${isMenuOpen ? ' is-open' : ''}`}>
            <nav className="landing-navbar-menu">
              <button type="button" className="landing-nav-link" onClick={() => handleSectionNavigation('features')}>
                Caracteristicas
              </button>
              <button type="button" className="landing-nav-link" onClick={() => handleSectionNavigation('pricing')}>
                Precios
              </button>
              <button type="button" className="landing-nav-link" onClick={() => handleSectionNavigation('contact')}>
                Contacto
              </button>
            </nav>

            <div className="landing-navbar-actions">
              <Button
                variant="outline"
                className="landing-button landing-button-navbar-outline"
                onClick={() => navigate('/login')}
              >
                Acceder
              </Button>
              <Button
                variant="default"
                className="landing-button landing-button-navbar-primary"
                onClick={() => navigate('/register')}
              >
                Empezar gratis
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main>
        <section id="hero" className="landing-hero">
          <div className="landing-hero-inner">
            <Badge variant="outline" className="landing-badge">
              Gestion Comercial Inteligente
            </Badge>

            <h1 className="landing-title">
              Todo lo que tu negocio necesita en un <span className="landing-title-highlight">dashboard</span>
            </h1>

            <p className="landing-subtitle">
              Centraliza clientes, ventas, reportes y alertas en una experiencia elegante, rapida y lista para escalar con tu operacion.
            </p>

            <div className="landing-actions">
              <Button
                variant="default"
                className="landing-button landing-button-primary"
                onClick={() => navigate('/login')}
              >
                Iniciar sesion
              </Button>
              <Button
                variant="outline"
                className="landing-button landing-button-outline"
                onClick={() => navigate('/register')}
              >
                Registrarse
              </Button>
            </div>
          </div>
        </section>

        <section className="landing-stats" aria-label="Metricas clave">
          <div className="landing-stats-grid">
            {stats.map((stat) => (
              <article key={stat.label} className="landing-stat-item">
                <strong className="stat-number">{stat.value}</strong>
                <span className="stat-label">{stat.label}</span>
              </article>
            ))}
          </div>
        </section>

        <section id="features" className="landing-section landing-features">
          <div className="landing-section-heading">
            <span className="landing-section-kicker">Ventaja SharkFit</span>
            <h2>Por que SharkFit</h2>
            <p>
              Una plataforma pensada para equipos comerciales que necesitan velocidad, claridad operativa y control real del negocio.
            </p>
          </div>

          <div className="landing-features-grid">
            {features.map((feature) => (
              <article key={feature.title} className="landing-feature-card">
                <div className="landing-feature-icon" aria-hidden="true">{feature.icon}</div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="pricing" className="landing-section landing-pricing">
          <div className="landing-section-heading landing-section-heading-left">
            <span className="landing-section-kicker">Precios</span>
            <h2>Empieza simple. Escala con confianza.</h2>
            <p>
              Disenado para arrancar rapido y evolucionar junto con tus procesos, sin perder consistencia visual ni operativa.
            </p>
          </div>

          <div className="landing-pricing-grid">
            {pricingCards.map((plan) => (
              <article key={plan.name} className="landing-pricing-card">
                <div className="landing-pricing-header">
                  <span className="landing-pricing-name">{plan.name}</span>
                  <strong className="landing-pricing-price">{plan.price}</strong>
                </div>
                <p className="landing-pricing-description">{plan.description}</p>
                <ul className="landing-pricing-list">
                  {plan.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer id="contact" className="landing-footer">
        <div className="landing-footer-content">
          <p>© 2026 SharkFit. Todos los derechos reservados.</p>
          <div className="landing-footer-links">
            <button type="button" className="landing-footer-link">Terminos</button>
            <button type="button" className="landing-footer-link">Privacidad</button>
            <button type="button" className="landing-footer-link" onClick={() => handleSectionNavigation('hero')}>
              Contacto
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Landing;
