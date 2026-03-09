import React from 'react';

export function Button({ 
  children, 
  variant = 'default', 
  size = 'md', 
  className = '', 
  ...props 
}) {
  const baseStyles = 'font-medium rounded-lg transition-colors focus:outline-none';
  
  const variants = {
    default: 'bg-primary text-white hover:bg-primary-dark',
    secondary: 'bg-neutral-bg text-surface text-surface hover:bg-neutral-muted',
    ghost: 'hover:bg-neutral-bg text-surface',
    destructive: 'bg-danger text-white hover:bg-danger',
    outline: 'border border-neutral-border text-surface hover:bg-neutral-bg',
  };

  const sizes = {
    sm: 'px-3 py-1 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  const variantClass = variants[variant] || variants.default;
  const sizeClass = sizes[size] || sizes.md;

  return (
    <button 
      className={`${baseStyles} ${variantClass} ${sizeClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export default Button;
