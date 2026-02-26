import './Hero.css'

export default function Hero() {
  return (
    <section className="hero">
      <div className="container">
        <div className="hero-content">
          <span className="hero-badge">✨ Gestión Comercial Inteligente</span>
          <h1>Todo lo que tu negocio necesita en un dashboard</h1>
          <p>Gestiona clientes, ventas, alertas y reportes desde una sola plataforma. Aumenta productividad, reduce costos, crecimiento escalable.</p>
          <div className="hero-buttons">
            <a href="http://localhost:5173" className="btn-primary">Iniciar sesión</a>
            <a href="#pricing" className="btn-secondary">Ver precios</a>
          </div>
          <div className="hero-stats">
            <div className="stat">
              <p className="stat-number">500+</p>
              <p className="stat-label">Empresas activas</p>
            </div>
            <div className="stat">
              <p className="stat-number">10M+</p>
              <p className="stat-label">Datos procesados</p>
            </div>
            <div className="stat">
              <p className="stat-number">99.9%</p>
              <p className="stat-label">Uptime</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
