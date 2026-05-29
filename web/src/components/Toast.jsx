import React, { useState, useEffect, useCallback } from 'react';

// Sistema global de toasts: otros componentes importan `showToast()` para disparar notificaciones
let toastListener = null;

export const showToast = (message, type = 'info', duration = 4000) => {
  if (toastListener) {
    toastListener({ id: Date.now(), message, type, duration });
  }
};

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((toast) => {
    setToasts(prev => [...prev, toast]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== toast.id));
    }, toast.duration);
  }, []);

  useEffect(() => {
    toastListener = addToast;
    return () => { toastListener = null; };
  }, [addToast]);

  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      maxWidth: '420px',
    }}>
      {toasts.map(toast => (
        <div
          key={toast.id}
          style={{
            padding: '14px 20px',
            borderRadius: '8px',
            color: '#fff',
            fontSize: '0.9rem',
            lineHeight: '1.5',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            animation: 'toastSlideIn 0.3s ease-out',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            ...(toast.type === 'success' ? {
              background: 'linear-gradient(135deg, #1a472a, #0f2b1a)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
            } : toast.type === 'warning' ? {
              background: 'linear-gradient(135deg, #4a3520, #2d1f10)',
              border: '1px solid rgba(242, 109, 33, 0.4)',
            } : toast.type === 'error' ? {
              background: 'linear-gradient(135deg, #4a1a1a, #2d0f0f)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
            } : {
              background: 'linear-gradient(135deg, #1a2744, #0f1a2d)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
            }),
          }}
        >
          <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>
            {toast.type === 'success' ? '✅' : toast.type === 'warning' ? '💡' : toast.type === 'error' ? '❌' : 'ℹ️'}
          </span>
          <div dangerouslySetInnerHTML={{ __html: toast.message }} />
          <button
            onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255,255,255,0.5)',
              cursor: 'pointer',
              fontSize: '1rem',
              padding: '0',
              marginLeft: 'auto',
              flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>
      ))}
      <style>{`
        @keyframes toastSlideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
