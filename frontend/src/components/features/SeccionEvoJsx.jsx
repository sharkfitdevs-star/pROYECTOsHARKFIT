// ============================================================
// COMPONENTE REACT: SeccionEvo.jsx
// Copia este archivo a tu carpeta de components
// ============================================================

import React, { useState, useEffect } from 'react';

const SeccionEvo = () => {
  // Estado
  const [datos, setDatos] = useState({
    contactos: [],
    chats: [],
    grupos: [],
    mensajes: [],
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Configuración
  const MIDDLEWARE_URL = 'http://localhost:3000'; // Cambiar a tu URL

  // Función para obtener datos
  const obtenerDatosEvo = async () => {
    try {
      setLoading(true);
      setError(null);

      const [contactosRes, chatsRes, gruposRes, mensajesRes] = await Promise.all([
        fetch(`${MIDDLEWARE_URL}/api/contacts`),
        fetch(`${MIDDLEWARE_URL}/api/chats`),
        fetch(`${MIDDLEWARE_URL}/api/groups`),
        fetch(`${MIDDLEWARE_URL}/api/messages`),
      ]);

      const contactosData = await contactosRes.json();
      const chatsData = await chatsRes.json();
      const gruposData = await gruposRes.json();
      const mensajesData = await mensajesRes.json();

      setDatos({
        contactos: contactosData.data || [],
        chats: chatsData.data || [],
        grupos: gruposData.data || [],
        mensajes: mensajesData.data || [],
      });

      setLoading(false);
    } catch (err) {
      console.error('Error obteniendo datos de Evo:', err);
      setError('Error conectando con middleware');
      setLoading(false);
    }
  };

  // useEffect: Cargar datos al montar
  useEffect(() => {
    obtenerDatosEvo();

    // Actualizar cada 30 segundos
    const interval = setInterval(obtenerDatosEvo, 30000);

    return () => clearInterval(interval);
  }, []);

  // Render
  return (
    <div style={{ marginTop: '30px' }}>
      {/* Encabezado */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>
          📱 Datos de Evo en Tiempo Real
        </h2>
        <button
          onClick={obtenerDatosEvo}
          disabled={loading}
          style={{
            padding: '8px 16px',
            backgroundColor: loading ? '#95a5a6' : '#3498db',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '12px',
          }}
        >
          {loading ? '⏳ Actualizando...' : '🔄 Actualizar'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          padding: '15px',
          backgroundColor: '#fef5f5',
          border: '1px solid #e74c3c',
          borderRadius: '5px',
          color: '#e74c3c',
          marginBottom: '20px',
        }}>
          ❌ {error}
        </div>
      )}

      {/* Cards de estadísticas */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px',
        marginBottom: '30px',
      }}>
        {/* Card Contactos */}
        <CardStat
          icono="👥"
          titulo="Contactos Evo"
          valor={datos.contactos.length}
          color="#3498db"
          loading={loading}
        />

        {/* Card Chats */}
        <CardStat
          icono="💬"
          titulo="Chats Activos"
          valor={datos.chats.length}
          color="#27ae60"
          loading={loading}
        />

        {/* Card Grupos */}
        <CardStat
          icono="👫"
          titulo="Grupos"
          valor={datos.grupos.length}
          color="#9b59b6"
          loading={loading}
        />

        {/* Card Mensajes */}
        <CardStat
          icono="📨"
          titulo="Mensajes"
          valor={datos.mensajes.length}
          color="#f39c12"
          loading={loading}
        />
      </div>

      {/* Tabla de Contactos */}
      <div style={{
        background: 'white',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        marginBottom: '30px',
      }}>
        <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', fontWeight: 600 }}>
          Contactos Recientes
        </h3>
        <TablaContactos contactos={datos.contactos} loading={loading} />
      </div>

      {/* Tabla de Chats */}
      <div style={{
        background: 'white',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      }}>
        <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', fontWeight: 600 }}>
          Chats Activos
        </h3>
        <TablaChats chats={datos.chats} loading={loading} />
      </div>
    </div>
  );
};

// ============================================================
// COMPONENTE: CardStat
// ============================================================
const CardStat = ({ icono, titulo, valor, color, loading }) => (
  <div style={{
    background: 'white',
    padding: '20px',
    borderRadius: '8px',
    borderLeft: `4px solid ${color}`,
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div>
        <p style={{ margin: 0, color: '#7f8c8d', fontSize: '12px', fontWeight: 500 }}>
          {titulo}
        </p>
        <h3 style={{ margin: '10px 0 0 0', fontSize: '28px', fontWeight: 'bold', color: '#2c3e50' }}>
          {loading ? '-' : valor.toLocaleString()}
        </h3>
      </div>
      <div style={{ fontSize: '32px', opacity: 0.3 }}>
        {icono}
      </div>
    </div>
  </div>
);

// ============================================================
// COMPONENTE: TablaContactos
// ============================================================
const TablaContactos = ({ contactos, loading }) => {
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '20px', color: '#7f8c8d' }}>
        Cargando...
      </div>
    );
  }

  if (contactos.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '20px', color: '#7f8c8d' }}>
        No hay contactos
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto', border: '1px solid #ecf0f1', borderRadius: '5px' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '1px solid #ecf0f1' }}>
            <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#2c3e50' }}>
              Nombre
            </th>
            <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#2c3e50' }}>
              Teléfono
            </th>
            <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#2c3e50' }}>
              Email
            </th>
            <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#2c3e50' }}>
              Actualizado
            </th>
          </tr>
        </thead>
        <tbody>
          {contactos.slice(0, 10).map((contacto, index) => (
            <tr key={index} style={{ borderBottom: '1px solid #ecf0f1' }}>
              <td style={{ padding: '12px', color: '#2c3e50', fontWeight: 500 }}>
                {contacto.name || 'Sin nombre'}
              </td>
              <td style={{ padding: '12px', color: '#7f8c8d' }}>
                {contacto.phone || '-'}
              </td>
              <td style={{ padding: '12px', color: '#7f8c8d' }}>
                {contacto.email || '-'}
              </td>
              <td style={{ padding: '12px', color: '#7f8c8d', fontSize: '11px' }}>
                {new Date(contacto.updated_at).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ============================================================
// COMPONENTE: TablaChats
// ============================================================
const TablaChats = ({ chats, loading }) => {
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '20px', color: '#7f8c8d' }}>
        Cargando...
      </div>
    );
  }

  if (chats.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '20px', color: '#7f8c8d' }}>
        No hay chats
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto', border: '1px solid #ecf0f1', borderRadius: '5px' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '1px solid #ecf0f1' }}>
            <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#2c3e50' }}>
              Chat
            </th>
            <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#2c3e50' }}>
              Último Mensaje
            </th>
            <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#2c3e50' }}>
              Sin Leer
            </th>
            <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#2c3e50' }}>
              Actualizado
            </th>
          </tr>
        </thead>
        <tbody>
          {chats.slice(0, 10).map((chat, index) => (
            <tr key={index} style={{ borderBottom: '1px solid #ecf0f1' }}>
              <td style={{ padding: '12px', color: '#2c3e50', fontWeight: 500 }}>
                {chat.name || 'Sin nombre'}
              </td>
              <td style={{ padding: '12px', color: '#7f8c8d' }}>
                {(chat.last_message || '-').substring(0, 40)}
              </td>
              <td style={{ padding: '12px' }}>
                {chat.unread_count > 0 ? (
                  <span style={{
                    backgroundColor: '#e74c3c',
                    color: 'white',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                  }}>
                    {chat.unread_count}
                  </span>
                ) : '0'}
              </td>
              <td style={{ padding: '12px', color: '#7f8c8d', fontSize: '11px' }}>
                {new Date(chat.updated_at).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SeccionEvo;
