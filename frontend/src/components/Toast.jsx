import React, { useEffect } from 'react';

export function ToastItem({ toast, onClose }) {
  const { id, title, message, type, duration = 5000 } = toast;

  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id);
    }, duration);
    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  const typeClass = type === 'success' ? 'toast-success' : 'toast-info';

  return (
    <div className={`toast ${typeClass}`}>
      <div className="toast-content">
        <div className="toast-title">{title}</div>
        <div className="toast-msg">{message}</div>
      </div>
      <button className="toast-close" onClick={() => onClose(id)}>
        &times;
      </button>
    </div>
  );
}

export default function ToastContainer({ toasts, onClose }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <ToastItem 
          key={toast.id} 
          toast={toast} 
          onClose={onClose} 
        />
      ))}
    </div>
  );
}
