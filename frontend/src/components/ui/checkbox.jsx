import React from 'react'

// simple checkbox component used throughout UI
// because original file was missing we provide a minimal implementation
export function Checkbox({ checked, onCheckedChange, ...props }) {
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => {
        if (typeof onCheckedChange === 'function') onCheckedChange(e.target.checked)
      }}
      {...props}
    />
  )
}

// default export for compatibility
export default Checkbox
