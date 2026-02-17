import React from 'react';

export default function Label({ 
  htmlFor = '', 
  className = '', 
  children,
  required = false,
  ...props 
}) {
  return (
    <label 
      htmlFor={htmlFor}
      className={`block text-sm font-medium text-gray-700 ${className}`}
      {...props}
    >
      {children}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
  );
}
