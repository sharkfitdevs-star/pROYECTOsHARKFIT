import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import './Landing.css';

// Sección de estadísticas eliminada

const features = [
  {
    icon: '📊',
    title: 'Gestion integral',
    description: 'Administra colaboradores, inventario, ventas, clientes, remuneraciones, evaluaciones y mas desde un solo dashboard.',
  },
  {
    icon: '🔗',
    title: 'Integracion con EVO',
    description: 'Conecta tu sistema EVO5 y sincroniza datos de ventas, clientes y membresias automaticamente.',
  },
  {
    icon: '📈',
    title: 'Reportes y Business Intelligence',
    description: 'Genera reportes dinamicos, visualiza KPIs en tiempo real y toma decisiones basadas en datos con el Centro de Comando CEO.',
  },
];

const pricingCards = [
  {
    name: 'Starter',
    price: 'Gratis',
    description: 'Ideal para explorar SharkNegocios y ordenar la operacion inicial.',
    items: [
      'Dashboard unificado',
      'Gestion de clientes y ventas',
      'Modulos RRHH basicos',
      'Soporte por email',
    ],
  },
  {
    name: 'Growth',
    price: 'Escalable',
    description: 'Pensado para equipos que necesitan velocidad, visibilidad y control.',
    items: [
      'Integracion con EVO',
      'Business Intelligence avanzado',
      'Modulos de inventario completos',
      'Alertas automatizadas',
      'Exportacion de datos',
    ],
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
            Sharcknegocios
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
              {/* Botón Características eliminado */}
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

        {/* Sección de estadísticas eliminada */}

        <section id="features" className="landing-section landing-features">
          <div className="landing-section-heading">
            <span className="landing-section-kicker">Ventaja SharkNegocios</span>
            <h2>Por que SharkNegocios</h2>
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
          <p>© 2026 SharkNegocios. Todos los derechos reservados.</p>
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
