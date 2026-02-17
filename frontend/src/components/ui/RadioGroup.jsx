import React, { useState } from 'react';

export function RadioGroup({ onValueChange = () => {}, value = '', children, className = '' }) {
  return (
    <RadioGroupContext.Provider value={{ onValueChange, value }}>
      <div role="radiogroup" className={className}>
        {children}
      </div>
    </RadioGroupContext.Provider>
  );
}

const RadioGroupContext = React.createContext();

export function RadioGroupItem({ value, id, disabled = false, ...props }) {
  const context = React.useContext(RadioGroupContext);
  const isChecked = context?.value === value;

  const handleChange = () => {
    if (!disabled) {
      context.onValueChange(value);
    }
  };

  return (
    <input
      id={id}
      type="radio"
      name="radio-group"
      value={value}
      checked={isChecked}
      onChange={handleChange}
      disabled={disabled}
      className="w-4 h-4 accent-blue-600 cursor-pointer"
      {...props}
    />
  );
}

export function RadioGroupLabel({ htmlFor = '', children, className = '', ...props }) {
  return (
    <label 
      htmlFor={htmlFor}
      className={`ml-2 text-sm font-medium text-gray-700 cursor-pointer ${className}`}
      {...props}
    >
      {children}
    </label>
  );
}

export default RadioGroup;
