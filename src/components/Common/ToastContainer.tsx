import React from 'react';
import { CheckCircle2, Info, AlertCircle } from 'lucide-react';
import { useTracker } from '../../context/TrackerContext';

export const ToastContainer: React.FC = () => {
  const { toasts } = useTracker();

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className="toast">
          {t.type === 'success' && (
            <CheckCircle2 size={16} style={{ color: '#ffffff' }} />
          )}
          {t.type === 'info' && <Info size={16} style={{ color: '#ffffff' }} />}
          {t.type === 'error' && (
            <AlertCircle size={16} style={{ color: 'var(--accent-danger)' }} />
          )}
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
};
