import React from 'react';

export function Badge({ 
  children, 
  variant = 'default', 
  className = '', 
  ...props 
}) {
  const baseStyles = 'inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium';
  
  const variants = {
    default: 'bg-blue-100 text-blue-800',
    secondary: 'bg-gray-100 text-gray-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    destructive: 'bg-red-100 text-red-800',
    outline: 'border border-gray-300 text-gray-900 bg-white',
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
