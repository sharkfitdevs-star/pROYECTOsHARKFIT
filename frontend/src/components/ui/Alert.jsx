import React from 'react';

export function Alert({ variant = 'default', className = '', children, ...props }) {
  const variants = {
    default: 'bg-blue-50 border border-blue-200 text-blue-800',
    success: 'bg-green-50 border border-green-200 text-green-800',
    warning: 'bg-yellow-50 border border-yellow-200 text-yellow-800',
    destructive: 'bg-red-50 border border-red-200 text-red-800',
    info: 'bg-cyan-50 border border-cyan-200 text-cyan-800',
  };

  const variantClass = variants[variant] || variants.default;

  return (
    <div 
      role="alert"
      className={`px-4 py-3 rounded-lg ${variantClass} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function AlertTitle({ children, className = '' }) {
  return (
    <h4 className={`font-semibold mb-1 ${className}`}>
      {children}
    </h4>
  );
}

export function AlertDescription({ children, className = '' }) {
  return (
    <div className={`text-sm ${className}`}>
      {children}
    </div>
  );
}

export default Alert;
