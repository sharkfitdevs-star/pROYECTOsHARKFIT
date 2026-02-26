import React from "react";
import { Link } from "react-router-dom";
import "./Header.css";

export default function Header() {
  return (
    <header className="landing-header">
      <div className="container">
        <nav className="navbar">
          <div className="logo">📊 Sharkfit</div>
          <div className="nav-links">
            <a href="#features" className="nav-btn">Features</a>
            <Link to="/pricing" className="nav-btn">Ver precios</Link>
            <a href="#contact" className="nav-btn">Contacto</a>
            <a href="http://localhost:5173" className="nav-btn">Acceder</a>
          </div>
        </nav>
      </div>
    </header>
  );
}
