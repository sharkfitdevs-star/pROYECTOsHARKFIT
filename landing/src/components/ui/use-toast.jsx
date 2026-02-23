import { useState, useCallback } from 'react';

const toastQueue = [];
const listeners = [];

export const createToast = (toast) => {
  toastQueue.push(toast);
  notifyListeners();
};

const notifyListeners = () => {
  listeners.forEach(listener => listener());
};

const addListener = (callback) => {
  listeners.push(callback);
  return () => {
    const index = listeners.indexOf(callback);
    if (index > -1) listeners.splice(index, 1);
  };
};

export const useToast = () => {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((toastId = undefined) => {
    if (toastId) {
      setToasts(prev => prev.filter(t => t.id !== toastId));
    } else {
      setToasts([]);
    }
  }, []);

  const toast = useCallback((props) => {
    const id = Math.random().toString(36).substring(7);
    const newToast = { id, ...props };
    
    setToasts(prev => [...prev, newToast]);
    
    if (props.duration !== false) {
      setTimeout(() => {
        dismiss(id);
      }, props.duration || 5000);
    }
    
    return id;
  }, [dismiss]);

  return { toasts, toast, dismiss };
};

export const dismiss = (toastId = undefined) => {
  if (toastId) {
    const index = toastQueue.findIndex(t => t.id === toastId);
    if (index > -1) toastQueue.splice(index, 1);
  } else {
    toastQueue.length = 0;
  }
  notifyListeners();
};
