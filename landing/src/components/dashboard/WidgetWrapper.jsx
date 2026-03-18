import React from 'react';
import PropTypes from 'prop-types';

const wrapperBaseStyle = {
  borderRadius: '12px',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
  position: 'relative',
  background: 'transparent',
  padding: 0,
};
const headerBaseStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  cursor: 'grab',
  background: 'transparent',
  borderBottom: 'none',
  padding: '6px 12px',
  borderRadius: '12px 12px 0 0',
  transition: 'opacity 0.2s ease',
};
const titleBaseStyle = {
  flex: 1,
  color: '#1e293b',
  fontSize: '11px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
};
const removeBaseStyle = {
  background: 'transparent',
  border: 'none',
  color: '#475569',
  fontSize: '16px',
  cursor: 'pointer',
  padding: 0,
  marginLeft: '0.5rem',
  width: '24px',
  height: '24px',
  borderRadius: '6px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};
const dragBaseStyle = {
  cursor: 'grab',
  marginRight: '0.5rem',
  fontSize: '14px',
  color: '#334155',
  opacity: 0,
};
const lockStyle = {
  marginLeft: '0.5rem',
  color: '#1e293b',
};

export default function WidgetWrapper({
  id,
  title,
  isDefault = false,
  onRemove,
  children = null,
  size = 'medium',
  className = '',
}) {
  const [hovering, setHovering] = React.useState(false);
  const [removeHover, setRemoveHover] = React.useState(false);

  const handleClick = () => {
    if (!isDefault && window.confirm('¿Ocultar este widget? Puedes restaurarlo desde el panel lateral.')) {
      onRemove(id);
    }
  };

  const handleMouseEnter = () => setHovering(true);
  const handleMouseLeave = () => setHovering(false);
  const handleRemoveMouseEnter = () => setRemoveHover(true);
  const handleRemoveMouseLeave = () => setRemoveHover(false);

  const wrapperStyle = {
    ...wrapperBaseStyle,
    boxShadow: hovering ? '0 0 0 1px rgba(0,212,255,0.2)' : 'none',
  };

  const headerStyle = {
    ...headerBaseStyle,
    opacity: hovering ? 1 : 0,
    pointerEvents: hovering ? 'auto' : 'none',
  };

  const titleStyle = { ...titleBaseStyle };

  const removeBtnStyle = {
    ...removeBaseStyle,
    color: removeHover ? '#ef4444' : removeBaseStyle.color,
  };

  const dragHandleStyle = {
    ...dragBaseStyle,
    opacity: hovering ? 0.5 : 0,
  };

  return (
    <div
      className={`widget-wrapper ${className}`}
      style={wrapperStyle}
      data-size={size}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="widget-header" style={headerStyle}>
        <span className="drag-handle" style={dragHandleStyle}>≡</span>
        <span style={titleStyle}>{title}</span>
        {!isDefault ? (
          <button
            aria-label="Cerrar widget"
            style={removeBtnStyle}
            onClick={handleClick}
            onMouseEnter={handleRemoveMouseEnter}
            onMouseLeave={handleRemoveMouseLeave}
          >
            ×
          </button>
        ) : (
          <span style={lockStyle} title="widget predeterminado">🔒</span>
        )}
      </div>
      <div className="widget-content">{children}</div>
    </div>
  );
}

WidgetWrapper.propTypes = {
  id: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  isDefault: PropTypes.bool,
  onRemove: PropTypes.func.isRequired,
  children: PropTypes.node,
  size: PropTypes.string,
  className: PropTypes.string,
};



