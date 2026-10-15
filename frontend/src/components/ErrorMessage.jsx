import React from 'react';

export default function ErrorMessage({ error, onDismiss }) {
  if (!error) return null;

  return (
    <div className="error-alert-banner" role="alert">
      <div className="error-icon">⚠️</div>
      <div className="error-body">
        <h4 className="error-title">{error.title || 'System Notification'}</h4>
        <p className="error-message">{error.message || String(error)}</p>
        {error.hint && (
          <p className="error-hint">
            <strong>Hint:</strong> {error.hint}
          </p>
        )}
      </div>
      {onDismiss && (
        <button
          className="btn-dismiss"
          onClick={onDismiss}
          aria-label="Dismiss error notification"
        >
          ×
        </button>
      )}
    </div>
  );
}
