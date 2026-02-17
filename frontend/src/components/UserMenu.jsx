import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function UserMenu({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  // Cierra el menú al hacer click fuera o presionar Escape
  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    }
    function handleEsc(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [open]);

  const handleLogout = async () => {
    try {
      await fetch('/auth/logout', { method: 'POST', credentials: 'include' });
      localStorage.removeItem('access_token');
      sessionStorage.removeItem('access_token');
      if (onLogout) onLogout();
      navigate('/login', { replace: true });
    } catch (e) {
      navigate('/login', { replace: true });
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        className="flex items-center gap-2 px-3 py-2 rounded-full bg-gray-700 text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open ? 'true' : 'false'}
        tabIndex={0}
      >
        <span className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-600 text-lg font-bold uppercase">
          {user?.fullName ? user.fullName[0] : user?.username?.[0] || 'U'}
        </span>
        <span className="text-base font-medium">{user?.fullName || user?.username}</span>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <button
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-t-lg"
            onClick={handleLogout}
          >
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}
