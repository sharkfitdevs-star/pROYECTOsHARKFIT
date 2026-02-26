import './Footer.css'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-section">
            <h4>📊 Sharkfit</h4>
            <p>Gestión comercial inteligente para tu negocio</p>
          </div>
          <div className="footer-section">
            <h5>Producto</h5>
            <ul>
              <li><a href="#features">Features</a></li>
              <li><a href="#pricing">Pricing</a></li>
              <li><a href="#">Documentación</a></li>
              <li><a href="#">API</a></li>
            </ul>
          </div>
          <div className="footer-section">
            <h5>Empresa</h5>
            <ul>
              <li><a href="#">Sobre nosotros</a></li>
              <li><a href="#">Blog</a></li>
              <li><a href="#">Contacto</a></li>
              <li><a href="#">Carrera</a></li>
            </ul>
          </div>
          <div className="footer-section">
            <h5>Legal</h5>
            <ul>
              <li><a href="#">Privacidad</a></li>
              <li><a href="#">Términos</a></li>
              <li><a href="#">Seguridad</a></li>
              <li><a href="#">Cookies</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2026 Sharkfit. Todos los derechos reservados.</p>
          <div className="socials">
            <a href="#">Twitter</a>
            <a href="#">LinkedIn</a>
            <a href="#">GitHub</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
