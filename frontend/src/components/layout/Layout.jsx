import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Menu, X, LayoutDashboard, Users, Calendar, ShoppingCart, DollarSign, BarChart3, Settings, MessageSquare, RefreshCw, UserCheck, CalendarCheck, Upload, ClipboardCheck, ListChecks, BarChart2, ChevronDown, ChevronRight, Code, AlertCircle, Target, GitBranch, LogOut, Briefcase, Monitor, Bell, TrendingUp } from 'lucide-react';
import { User } from '@/entities/User';
import { PermissionProvider } from '@/components/PermissionContext';



export default function Layout({ children, currentPageName }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [user, setUser] = useState(null);
  const [collapsedSections, setCollapsedSections] = useState({
    'Costos': true,
    'Prospectos': true,
    'Agenda': true,
    'Retención': true,
    'Checklist': true,
    'Panel de Trabajo': true,
    'Proyección': true,
    'Configuración': true
  });
  const location = useLocation();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userData = await User.me();
        setUser(userData);
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };
    fetchUser();
  }, []);

  const menuSections = [
    {
      title: 'Inicio',
      icon: LayoutDashboard,
      href: createPageUrl('Home'),
      single: true
    },
    {
      title: 'Dashboard Comercial',
      icon: BarChart3,
      href: createPageUrl('DashboardComercial'),
      single: true
    },
    {
      title: 'Dashboard Financiero',
      icon: DollarSign,
      href: createPageUrl('DashboardFinanciero'),
      single: true
    },
    {
      title: 'Costos',
      icon: DollarSign,
      items: [
        {
          name: 'Dashboard Costos',
          href: createPageUrl('DashboardCostos'),
          icon: BarChart3
        },
        {
          name: 'Gastos ADS',
          href: createPageUrl('GastosAds'),
          icon: DollarSign
        }
      ]
    },
    {
      title: 'Prospectos',
      icon: Users,
      items: [
        {
          name: 'Prospectos',
          href: createPageUrl('Prospectos'),
          icon: Users
        },
        {
          name: 'Leads Diarios',
          href: createPageUrl('LeadsDiarios'),
          icon: LayoutDashboard
        },
        {
          name: 'Remarketing',
          href: createPageUrl('Remarketing'),
          icon: MessageSquare
        }
      ]
    },
    {
      title: 'Agenda',
      icon: Calendar,
      items: [
        {
          name: 'Agenda',
          href: createPageUrl('Agenda'),
          icon: Calendar
        },
        {
          name: 'Compromisos de Compra',
          href: createPageUrl('CompromisosCompra'),
          icon: CalendarCheck
        },
        {
          name: 'NPS Online',
          href: createPageUrl('NPSOnline'),
          icon: Target
        },
        {
          name: 'NPS Cruzados',
          href: createPageUrl('NPSCruzados'),
          icon: GitBranch
        }
      ]
    },
    {
      title: 'Ventas',
      icon: ShoppingCart,
      href: createPageUrl('Ventas'),
      single: true
    },
    {
      title: 'Retención',
      icon: RefreshCw,
      items: [
        {
          name: 'Clientes',
          href: createPageUrl('Clientes'),
          icon: UserCheck
        },
        {
          name: 'Alertas Renovación',
          href: createPageUrl('AlertasRenovacion'),
          icon: AlertCircle
        },
        {
          name: 'Clientes Nuevo',
          href: createPageUrl('ClientesNuevo'),
          icon: UserCheck
        },
        {
          name: 'Retención por Cohorte',
          href: createPageUrl('RetencionCohorte'),
          icon: RefreshCw
        }
      ]
    },
    {
      title: 'Checklist',
      icon: ClipboardCheck,
      items: [
        {
          name: 'Mis Checklist',
          href: createPageUrl('MisChecklist'),
          icon: ClipboardCheck
        },
        {
          name: 'Dashboard Checklist',
          href: createPageUrl('DashboardChecklist'),
          icon: BarChart2
        },
        {
          name: 'Configuración Checklist',
          href: createPageUrl('ConfiguracionChecklist'),
          icon: ListChecks
        }
      ]
    },
    {
      title: 'Panel de Trabajo',
      icon: Briefcase,
      items: [
        {
          name: 'Dashboard Sistema Online',
          href: createPageUrl('DashboardSistemaOnline'),
          icon: LayoutDashboard
        },
        {
          name: 'Sistema Online',
          href: createPageUrl('SistemaOnline'),
          icon: Monitor
        },
        {
          name: 'Responsable de Sede',
          href: createPageUrl('DashboardRS'),
          icon: UserCheck
        }
      ]
    },
    {
      title: 'Proyección',
      icon: TrendingUp,
      items: [
        {
          name: 'Proyección Clientes Nuevos',
          href: createPageUrl('ProyeccionClientesNuevos'),
          icon: TrendingUp
        },
        {
          name: 'Configuración Proyección',
          href: createPageUrl('ConfiguracionProyeccion'),
          icon: Settings
        }
      ]
    },
    {
      title: 'Configuración',
      icon: Settings,
      items: [
        {
          name: 'Configuración Evo5',
          href: createPageUrl('ConfiguracionEvo5'),
          icon: Settings
        },
        {
          name: 'Configuración de Alertas',
          href: createPageUrl('ConfiguracionAlertas'),
          icon: Bell
        },
        {
          name: 'Migración de Datos',
          href: createPageUrl('Migracion'),
          icon: Upload
        },
        {
          name: 'API Export',
          href: createPageUrl('APIExport'),
          icon: Code
        },
        {
          name: 'Catálogos',
          href: createPageUrl('Configuracion'),
          icon: Settings
        }
      ]
    },
    {
      title: 'Cerrar Sesión',
      icon: LogOut,
      href: '#logout',
      single: true,
      isLogout: true
    }
  ];

  const toggleSection = (title) => {
    setCollapsedSections(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  const isActive = (href) => {
    return location.pathname === href || location.pathname === href + '/';
  };

  return (
    <PermissionProvider>
      <div className="min-h-screen bg-gray-50">
        {/* Sidebar */}
        <aside
          className={`fixed top-0 left-0 z-40 h-screen transition-transform ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } bg-white border-r border-gray-200 w-64 lg:w-64`}
        >
          <div className="h-full px-3 py-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-6 px-2">
              <h2 className="text-xl font-bold text-gray-800">Control Comercial</h2>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="lg:hidden p-1 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* User Info */}
            {user && (
              <div className="mb-6 px-2 pb-4 border-b border-gray-200">
                <p className="text-sm font-medium text-gray-900">{user.fullName}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
                <p className="text-xs text-blue-600 font-medium mt-1">{user.role}</p>
              </div>
            )}

            {/* Navigation */}
            <nav className="space-y-1">
              {menuSections.map((section) => {
                const SectionIcon = section.icon;
                
                // Si es un item simple (single: true)
                if (section.single) {
                  // Si es el botón de logout
                  if (section.isLogout) {
                    return (
                      <button
                        key={section.title}
                        onClick={async () => {
                          await User.logout();
                          window.location.href = '/login';
                        }}
                        className="w-full flex items-center px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <SectionIcon className="w-5 h-5 mr-3 text-red-600" />
                        {section.title}
                      </button>
                    );
                  }
                  
                  const active = isActive(section.href);
                  return (
                    <Link
                      key={section.title}
                      to={section.href}
                      className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                        active
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <SectionIcon className={`w-5 h-5 mr-3 ${active ? 'text-blue-700' : 'text-gray-500'}`} />
                      {section.title}
                    </Link>
                  );
                }

                // Si es una sección colapsable
                const isCollapsed = collapsedSections[section.title];
                const hasActiveChild = section.items?.some(item => isActive(item.href));

                return (
                  <div key={section.title}>
                    {/* Header de la sección */}
                    <button
                      onClick={() => toggleSection(section.title)}
                      className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                        hasActiveChild
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center">
                        <SectionIcon className={`w-5 h-5 mr-3 ${hasActiveChild ? 'text-blue-700' : 'text-gray-500'}`} />
                        {section.title}
                      </div>
                      {isCollapsed ? (
                        <ChevronRight className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>

                    {/* Items de la sección */}
                    {!isCollapsed && section.items && (
                      <div className="ml-4 mt-1 space-y-1">
                        {section.items.map((item) => {
                          const ItemIcon = item.icon;
                          const active = isActive(item.href);
                          return (
                            <Link
                              key={item.name}
                              to={item.href}
                              className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                                active
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'text-gray-600 hover:bg-gray-50'
                              }`}
                            >
                              <ItemIcon className={`w-4 h-4 mr-3 ${active ? 'text-blue-700' : 'text-gray-400'}`} />
                              {item.name}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <div className={`transition-all ${isSidebarOpen ? 'lg:ml-64' : 'ml-0'}`}>
          {/* Top Bar */}
          <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
            <div className="px-3 sm:px-4 py-3 flex items-center justify-between">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 rounded-lg hover:bg-gray-100"
              >
                <Menu className="w-5 h-5" />
              </button>
              <h1 className="text-sm sm:text-lg font-semibold text-gray-800 truncate max-w-[60vw]">{currentPageName}</h1>
              <div className="w-9"></div> {/* Spacer for centering */}
            </div>
          </header>

          {/* Page Content */}
          <main className="p-3 sm:p-4 md:p-6">
            {children}
          </main>
        </div>

        {/* Mobile Overlay */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          ></div>
        )}
      </div>
    </PermissionProvider>
  );
}