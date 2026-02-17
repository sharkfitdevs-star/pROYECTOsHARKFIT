import React from 'react';

export default function Textarea({ 
  className = '', 
  disabled = false,
  rows = 4,
  ...props 
}) {
  return (
    <textarea
      rows={rows}
      disabled={disabled}
      className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed resize-vertical ${className}`}
      {...props}
    />
  );
}
