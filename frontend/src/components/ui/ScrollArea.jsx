import React from 'react';

export function ScrollArea({ children, className = '', ...props }) {
  return (
    <div 
      className={`overflow-auto ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function ScrollBar({ orientation = 'vertical', className = '', ...props }) {
  if (orientation === 'vertical') {
    return (
      <div 
        className={`w-2 bg-gray-300 rounded hover:bg-gray-400 ${className}`}
        {...props}
      />
    );
  }

  return (
    <div 
      className={`h-2 bg-gray-300 rounded hover:bg-gray-400 ${className}`}
      {...props}
    />
  );
}

export default ScrollArea;
