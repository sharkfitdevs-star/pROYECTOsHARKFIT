import React, { useState } from 'react';

export function Dialog({ open = false, onOpenChange = () => {}, children }) {
  const [isOpen, setIsOpen] = useState(open);

  const handleOpenChange = (newOpen) => {
    setIsOpen(newOpen);
    onOpenChange(newOpen);
  };

  return (
    <DialogProvider value={{ isOpen, onOpenChange: handleOpenChange }}>
      {children}
    </DialogProvider>
  );
}

const DialogContext = React.createContext();

function DialogProvider({ value, children }) {
  return (
    <DialogContext.Provider value={value}>
      {children}
    </DialogContext.Provider>
  );
}

export function DialogTrigger({ children, asChild = false, ...props }) {
  const context = React.useContext(DialogContext);

  const component = (
    <button 
      onClick={() => context.onOpenChange(true)}
      {...props}
    >
      {children}
    </button>
  );

  return asChild ? children : component;
}

export function DialogContent({ children, className = '' }) {
  const context = React.useContext(DialogContext);

  if (!context?.isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/50 z-40"
        onClick={() => context.onOpenChange(false)}
      />
      <div className={`fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] bg-white rounded-lg shadow-lg z-50 w-full max-w-sm p-6 ${className}`}>
        {children}
      </div>
    </>
  );
}

export function DialogHeader({ children, className = '' }) {
  return (
    <div className={`mb-4 ${className}`}>
      {children}
    </div>
  );
}

export function DialogTitle({ children, className = '' }) {
  return (
    <h2 className={`text-lg font-semibold text-gray-900 ${className}`}>
      {children}
    </h2>
  );
}

export function DialogDescription({ children, className = '' }) {
  return (
    <p className={`text-sm text-gray-500 ${className}`}>
      {children}
    </p>
  );
}

export function DialogFooter({ children, className = '' }) {
  return (
    <div className={`mt-6 flex gap-2 justify-end ${className}`}>
      {children}
    </div>
  );
}

export function DialogClose({ children, ...props }) {
  const context = React.useContext(DialogContext);

  return (
    <button 
      onClick={() => context.onOpenChange(false)}
      {...props}
    >
      {children}
    </button>
  );
}

export default Dialog;
