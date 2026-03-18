import { useEffect, useState } from 'react';

const listeners = new Set();
let toasts = [];

const notify = () => {
  listeners.forEach((listener) => listener(toasts));
};

export const toast = ({ title, description, variant = 'default', duration = 4000, ...rest }) => {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const nextToast = { id, title, description, variant, ...rest };

  toasts = [nextToast, ...toasts].slice(0, 5);
  notify();

  if (duration !== Infinity) {
    setTimeout(() => dismiss(id), duration);
  }

  return { id };
};

export const dismiss = (id) => {
  toasts = toasts.filter((t) => t.id !== id);
  notify();
};

export const useToast = () => {
  const [state, setState] = useState(toasts);

  useEffect(() => {
    listeners.add(setState);
    return () => listeners.delete(setState);
  }, []);

  return { toasts: state, toast, dismiss };
};
