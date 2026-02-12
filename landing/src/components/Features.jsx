import './Features.css'

const features = [
  {
    icon: '📊',
    title: 'Dashboard Inteligente',
    description: 'Visualiza todas tus métricas en tiempo real. Ventas, clientes, tareas pendientes.'
  },
  {
    icon: '👥',
    title: 'Gestión de Clientes',
    description: 'Centraliza toda la información de tus clientes en un lugar. Sin duplicados, sin confusion.'
  },
  {
    icon: '💼',
    title: 'Seguimiento de Ventas',
    description: 'Rastrea cada oportunidad desde el primer contacto hasta el cierre.'
  },
  {
    icon: '📅',
    title: 'Agendamientos',
    description: 'Calendario integrado para gestionar reuniones, demostraciones y seguimientos.'
  },
  {
    icon: '🚨',
    title: 'Sistema de Alertas',
    description: 'Recibe notificaciones automáticas de eventos importantes. Nunca pierdas oportunidades.'
  },
  {
    icon: '📈',
    title: 'Reportes Avanzados',
    description: 'Genera reportes detallados para analizar tendencias y tomar decisiones.'
  }
]

export default function Features() {
  return (
    <section id="features" className="features">
      <div className="container">
        <div className="features-header">
          <h2>Funcionalidades Poderosas</h2>
          <p>Todo lo que necesitas para gestionar tu negocio de manera eficiente</p>
        </div>
        <div className="features-grid">
          {features.map((feature, idx) => (
            <div key={idx} className="feature-card">
              <div className="feature-icon">{feature.icon}</div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
