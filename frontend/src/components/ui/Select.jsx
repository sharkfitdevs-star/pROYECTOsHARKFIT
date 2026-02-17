import React, { useState } from 'react';

export function Select({ children, onValueChange = () => {}, value = '' }) {
  return (
    <SelectContext.Provider value={{ onValueChange, value }}>
      {children}
    </SelectContext.Provider>
  );
}

const SelectContext = React.createContext();

export function SelectTrigger({ children, className = '', ...props }) {
  const context = React.useContext(SelectContext);
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className={`relative ${className}`} {...props}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg text-left focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {children}
      </button>
      {isOpen && (
        <SelectContext.Provider value={{ ...context, isOpen, setIsOpen }}>
          <SelectContent />
        </SelectContext.Provider>
      )}
    </div>
  );
}

export function SelectValue({ placeholder = 'Select...' }) {
  const context = React.useContext(SelectContext);
  return <span>{context?.value || placeholder}</span>;
}

export function SelectContent({ children, className = '' }) {
  const context = React.useContext(SelectContext);

  return (
    <div className={`absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 ${className}`}>
      {children}
    </div>
  );
}

export function SelectItem({ value, children, className = '', ...props }) {
  const context = React.useContext(SelectContext);

  return (
    <button
      onClick={() => {
        context.onValueChange(value);
        if (context.setIsOpen) context.setIsOpen(false);
      }}
      className={`w-full text-left px-4 py-2 hover:bg-gray-100 ${context?.value === value ? 'bg-blue-50 text-blue-600' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function SelectGroup({ children, className = '' }) {
  return (
    <div className={`py-2 ${className}`}>
      {children}
    </div>
  );
}

export function SelectLabel({ children, className = '' }) {
  return (
    <div className={`px-4 py-2 text-sm font-semibold text-gray-600 ${className}`}>
      {children}
    </div>
  );
}

export function SelectSeparator({ className = '' }) {
  return <div className={`border-t border-gray-200 ${className}`} />;
}

export default Select;
