import React from 'react';

export default function EvoConnectionForm({
  show,
  onClose,
  connForm,
  setConnForm,
  labelStyle,
  inputStyle,
  connError,
  connSaving,
  onSave,
}) {
  if (!show) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1001, backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        background: 'linear-gradient(145deg, #1e2333, #161b28)',
        borderRadius: '14px', padding: '28px',
        maxWidth: '520px', width: '90%',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
        animation: 'fadeIn 0.2s ease',
      }}>

        {/* Cabecera del modal de conexión */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#e8e8e8', margin: 0 }}>
            Nueva conexión API
          </h3>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)',
            fontSize: '18px', cursor: 'pointer', lineHeight: 1,
          }}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {/* Nombre */}
          <div>
            <label style={labelStyle}>Nombre de la conexión *</label>
            <input
              value={connForm.connectionName}
              onChange={(e) => setConnForm((f) => ({ ...f, connectionName: e.target.value }))}
              placeholder="Ej: Mi API Principal"
              style={inputStyle}
            />
          </div>

          {/* URL base: solo visible para proveedores no EVO */}
          {connForm.provider !== 'evo' && (
            <div>
              <label style={labelStyle}>URL base (endpoint)*</label>
              <input
                value={connForm.baseUrl}
                onChange={(e) => setConnForm((f) => ({ ...f, baseUrl: e.target.value }))}
                placeholder="https://api.tuservicio.com"
                style={inputStyle}
              />
            </div>
          )}

          {/* Proveedor + auth */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Proveedor</label>
              <select
                value={connForm.provider}
                onChange={(e) => {
                  const newProvider = e.target.value;
                  setConnForm((f) => ({
                    ...f,
                    provider: newProvider,
                    authType: newProvider === 'evo' ? 'basic_evo' : f.authType,
                  }));
                }}
                style={inputStyle}
              >
                <option value="evo">EVO</option>
                <option value="custom">Personalizado</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Tipo de auth</label>
              <select
                value={connForm.provider === 'evo' ? 'basic_evo' : connForm.authType}
                onChange={(e) => connForm.provider !== 'evo' && setConnForm((f) => ({ ...f, authType: e.target.value }))}
                disabled={connForm.provider === 'evo'}
                style={{
                  ...inputStyle,
                  opacity: connForm.provider === 'evo' ? 0.6 : 1,
                  cursor: connForm.provider === 'evo' ? 'default' : 'pointer',
                }}
              >
                <option value="bearer">Bearer Token</option>
                <option value="apikey">API Key</option>
                <option value="basic">Basic (user/pass)</option>
                {connForm.provider === 'evo' && <option value="basic_evo">EVO Basic Auth</option>}
              </select>
            </div>
          </div>

          {/* Campos EVO */}
          {connForm.provider === 'evo' && (
            <>
              <div>
                <label style={labelStyle}>DNS del Gimnasio *</label>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>
                  Ej: si accedes en migimnasio.w12app.com.br, ingresa "migimnasio"
                </div>
                <input
                  value={connForm.dns}
                  onChange={(e) => setConnForm((f) => ({ ...f, dns: e.target.value }))}
                  placeholder="migimnasio"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>API Key EVO *</label>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>
                  Generada en EVO Settings → Integrations
                </div>
                <input
                  type="password"
                  value={connForm.apiKey}
                  onChange={(e) => setConnForm((f) => ({ ...f, apiKey: e.target.value }))}
                  placeholder="API Key cifrada..."
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>ID de Sede (Opcional)</label>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>
                  Solo si quieres filtrar por una sede específica. Déjalo vacío para todas.
                </div>
                <input
                  value={connForm.filialId}
                  onChange={(e) => setConnForm((f) => ({ ...f, filialId: e.target.value }))}
                  placeholder="1"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Plan EVO</label>
                <select
                  value={connForm.planType}
                  onChange={(e) => setConnForm((f) => ({ ...f, planType: e.target.value }))}
                  style={inputStyle}
                >
                  <option value="plus">API Plus (1.000/mes)</option>
                  <option value="pro">API Pro (ilimitado diario)</option>
                </select>
              </div>
            </>
          )}

          {/* Campos para providers no EVO */}
          {connForm.provider !== 'evo' && (
            <>
              {connForm.authType === 'bearer' && (
                <div>
                  <label style={labelStyle}>Bearer Token *</label>
                  <input
                    type="password"
                    value={connForm.token}
                    onChange={(e) => setConnForm((f) => ({ ...f, token: e.target.value }))}
                    placeholder="Ej: abc123xyz..."
                    style={inputStyle}
                  />
                </div>
              )}
              {connForm.authType === 'apikey' && (
                <div>
                  <label style={labelStyle}>API Key *</label>
                  <input
                    type="password"
                    value={connForm.apiKey}
                    onChange={(e) => setConnForm((f) => ({ ...f, apiKey: e.target.value }))}
                    placeholder="sk-..."
                    style={inputStyle}
                  />
                </div>
              )}
              {connForm.authType === 'basic' && (
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Usuario</label>
                    <input
                      value={connForm.token}
                      onChange={(e) => setConnForm((f) => ({ ...f, token: e.target.value }))}
                      placeholder="usuario"
                      style={inputStyle}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Contraseña</label>
                    <input
                      type="password"
                      value={connForm.secret}
                      onChange={(e) => setConnForm((f) => ({ ...f, secret: e.target.value }))}
                      placeholder="••••••••"
                      style={inputStyle}
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {/* Dataset por defecto */}
          <div>
            <label style={labelStyle}>Dataset por defecto</label>
            <select
              value={connForm.defaultDataset}
              onChange={(e) => setConnForm((f) => ({ ...f, defaultDataset: e.target.value }))}
              style={inputStyle}
            >
              <option value="ambos">Ventas y Clientes</option>
              <option value="ventas">Solo Ventas</option>
              <option value="clientes">Solo Clientes</option>
              {connForm.provider === 'evo' && (
                <>
                  <option value="prospectos">Prospectos</option>
                  <option value="entradas">Accesos/Entradas</option>
                  <option value="membresias">Membresías</option>
                  <option value="pagos">Pagos/Deudas</option>
                  <option value="todo">Todo (todos los datos)</option>
                </>
              )}
            </select>
          </div>

          {connError && (
            <div style={{
              padding: '10px 14px', borderRadius: '8px', fontSize: '12px',
              background: 'rgba(226,75,74,0.12)', border: '1px solid rgba(226,75,74,0.25)',
              color: '#E24B4A',
            }}>
              {connError}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
            <button
              onClick={onClose}
              style={{
                padding: '9px 18px', borderRadius: '8px', fontSize: '13px',
                background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.5)',
                border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              onClick={onSave}
              disabled={connSaving}
              style={{
                padding: '9px 20px', borderRadius: '8px', fontSize: '13px',
                fontWeight: 600, cursor: connSaving ? 'wait' : 'pointer',
                background: connSaving ? 'rgba(255,255,255,0.07)' : '#1D9E75',
                color: connSaving ? 'rgba(255,255,255,0.35)' : '#fff',
                border: 'none', transition: 'all 0.15s ease',
              }}
            >
              {connSaving ? 'Guardando...' : 'Guardar conexión'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
