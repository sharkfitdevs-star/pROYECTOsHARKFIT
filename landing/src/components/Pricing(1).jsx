import './Pricing.css'

const plans = [
  {
    name: 'Starter',
    price: '$99',
    period: '/mes',
    description: 'Perfecto para empezar',
    features: [
      'Hasta 100 clientes',
      'Dashboard básico',
      'Gestión de ventas',
      'Soporte por email',
      'Almacenamiento 10GB'
    ],
    button: 'Comenzar',
    featured: false
  },
  {
    name: 'Professional',
    price: '$299',
    period: '/mes',
    description: 'Para negocios en crecimiento',
    features: [
      'Clientes ilimitados',
      'Dashboard avanzado',
      'Todas las funciones',
      'Soporte prioritario',
      'Almacenamiento 100GB',
      'API access',
      'Integraciones'
    ],
    button: 'Comenzar ahora',
    featured: true
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: 'Contactanos',
    description: 'Solución personalizada',
    features: [
      'Todo lo de Professional',
      'Soporte 24/7',
      'Almacenamiento ilimitado',
      'Implementación dedicada',
      'Training personalizado',
      'SLA garantizado',
      'Custom development'
    ],
    button: 'Solicitar demo',
    featured: false
  }
]

export default function Pricing() {
  return (
    <section id="pricing" className="pricing">
      <div className="container">
        <div className="pricing-header">
          <h2>Planes simples y transparentes</h2>
          <p>Elige el plan que mejor se ajuste a tu negocio</p>
        </div>
        <div className="pricing-grid">
          {plans.map((plan, idx) => (
            <div key={idx} className={`pricing-card ${plan.featured ? 'featured' : ''}`}>
              {plan.featured && <div className="featured-badge">Popular</div>}
              <h3>{plan.name}</h3>
              <p className="price">{plan.price}<span>{plan.period}</span></p>
              <p className="description">{plan.description}</p>
              <button className={plan.featured ? 'btn-primary' : 'btn-secondary'}>
                {plan.button}
              </button>
              <div className="features-list">
                <p className="features-label">Incluye:</p>
                <ul>
                  {plan.features.map((feature, fIdx) => (
                    <li key={fIdx}>✓ {feature}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
