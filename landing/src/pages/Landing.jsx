import { useNavigate } from "react-router-dom";
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import "./Landing.css";

function Landing() {
  const navigate = useNavigate();

  return (
    <div className="landing-root">
      <header className="landing-navbar bg-white border-b border-neutral-border">
        <div className="landing-navbar-logo text-surface">Sharkfit</div>
        <nav className="landing-navbar-menu">
          <Button variant="default" onClick={() => navigate('/#pricing')}>Ver precios</Button>
          <Button variant="default" onClick={() => navigate('/#contact')}>Contacto</Button>
          <Button variant="default" onClick={() => navigate('/login')}>Acceder</Button>
        </nav>
      </header>

      <main className="landing-hero bg-gradient-to-br from-primary-dark to-primary text-white">
        <Badge variant="default" className="mb-4">Gestión Comercial Inteligente</Badge>
        <h1 className="landing-title text-white">
          Todo lo que tu negocio necesita en un dashboard
        </h1>
        <p className="landing-subtitle text-primary-light">
          Controla clientes, ventas, alertas y reportes desde un solo lugar. Más
          productividad y decisiones inteligentes.
        </p>
        <div className="landing-actions">
          <Button variant="default" onClick={() => navigate('/login')}>Iniciar sesión</Button>
          <Button variant="outline" className="border-white text-white hover:bg-white/10" onClick={() => navigate('/register')}>Registrarse</Button>
        </div>
      </main>

    </div>
  );
}

export default Landing;




