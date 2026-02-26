import './Header.css'

export default function Header() {
  return (
    <header className="landing-header">
      <div className="container">
        <nav className="navbar">
          <div className="logo">📊 Vendify</div>
          <div className="nav-links">
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
            <a href="#contact">Contacto</a>
            <a href="http://localhost:5173" className="btn-login">Acceder</a>
          </div>
        </nav>
      </div>
    </header>
  )
}
