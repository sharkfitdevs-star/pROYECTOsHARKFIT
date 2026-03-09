import React from 'react';

export function Badge({ 
  children, 
  variant = 'default', 
  className = '', 
  ...props 
}) {
  const baseStyles = 'inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium';
  
  const variants = {
    default: 'bg-primary-light text-primary-dark',
    secondary: 'bg-neutral-bg text-neutral-muted',
    success: 'bg-success/20 text-success',
    warning: 'bg-warning/20 text-warning',
    destructive: 'bg-danger/20 text-danger',
    outline: 'border border-neutral-border text-surface bg-surface',
  };

  const variantClass = variants[variant] || variants.default;

  return (
    <span 
      className={`${baseStyles} ${variantClass} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}

export default Badge;
