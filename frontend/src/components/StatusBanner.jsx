import React, { useState } from 'react';
import { api } from '../services/api';

export default function StatusBanner({
  backendStatus,
  dbStatus,
  groqStatus,
  integrationsStatus,
  onRefresh,
  isChecking,
}) {
  const [oauthError, setOauthError] = useState(null);
  const [isAuthorizing, setIsAuthorizing] = useState(false);

  const isBackendOk = backendStatus?.ok;
  const isDbOk = dbStatus?.ok && dbStatus?.data?.status === 'connected';
  const isGroqOk = groqStatus?.ok && groqStatus?.data?.status === 'connected';
  const isGroqDegraded = groqStatus?.data?.status === 'degraded';

  const isGoogleConnected = Boolean(
    integrationsStatus?.drive?.authenticated || integrationsStatus?.gmail?.authenticated
  );
  const connectedEmail =
    integrationsStatus?.drive?.user_email || integrationsStatus?.gmail?.user_email;
  const isGoogleConfigured = Boolean(
    integrationsStatus?.drive?.configured || integrationsStatus?.gmail?.configured
  );

  const handleConnectGoogle = async () => {
    setOauthError(null);
    setIsAuthorizing(true);
    try {
      const res = await api.getGoogleLoginUrl();
      if (res.ok && res.data?.auth_url) {
        window.location.href = res.data.auth_url;
      } else {
        setOauthError(
          res.data?.detail ||
            'Could not initiate Google login. Configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in backend/.env.'
        );
      }
    } catch (err) {
      setOauthError(err.message || 'Failed to reach Google authorization service.');
    } finally {
      setIsAuthorizing(false);
    }
  };

  const handleDisconnectGoogle = async () => {
    try {
      await api.disconnectGoogleAuth();
      onRefresh();
    } catch (err) {
      console.warn('Disconnect error:', err);
    }
  };

  const groqDotClass = isGroqOk
    ? 'dot-online'
    : isGroqDegraded
    ? 'dot-degraded'
    : 'dot-offline';

  return (
    <div className="status-banner">
      <div className="status-group">
        {/* Backend Status */}
        <div className="status-item">
          <span className={`status-dot ${isBackendOk ? 'dot-online' : 'dot-offline'}`} />
          <span className="status-label">FastAPI:</span>
          <span className="status-value">
            {isBackendOk ? `Online (v${backendStatus.data.version || '0.3.0'})` : 'Offline'}
          </span>
        </div>

        {/* MongoDB Status */}
        <div className="status-item">
          <span className={`status-dot ${isDbOk ? 'dot-online' : 'dot-offline'}`} />
          <span className="status-label">MongoDB:</span>
          <span className="status-value">
            {isDbOk
              ? `Connected (${dbStatus.data.database} - ${dbStatus.data.latency_ms}ms)`
              : 'Disconnected'}
          </span>
        </div>

        {/* Groq LLM Status */}
        <div className="status-item">
          <span className={`status-dot ${groqDotClass}`} />
          <span className="status-label">Groq LLM:</span>
          <span className="status-value">
            {isGroqOk
              ? `Connected (${groqStatus.data.model} - ${groqStatus.data.latency_ms}ms)`
              : isGroqDegraded
              ? `Rate Limited (${groqStatus.data.model})`
              : `Disconnected (${groqStatus?.data?.model || 'openai/gpt-oss-20b'})`}
          </span>
        </div>
      </div>

      {/* External Modular Integrations Status */}
      {integrationsStatus && (
        <div className="integrations-banner-row">
          <span className="integrations-title">Integrations:</span>
          <div className="integrations-chips-list">
            {Object.entries(integrationsStatus).map(([key, item]) => {
              const isReady = item.status === 'ready';
              return (
                <span
                  key={key}
                  className={`integration-chip ${isReady ? 'integ-ready' : 'integ-pending'}`}
                  title={`${item.name}: ${item.description} (${item.setup_hint || ''})`}
                >
                  <span className={`status-dot ${isReady ? 'dot-online' : 'dot-degraded'}`} />
                  {item.name}: {isReady ? 'READY' : 'PENDING SETUP'}
                </span>
              );
            })}
          </div>

          {/* Google OAuth Connect / Account pill */}
          <div className="oauth-actions-group">
            {isGoogleConnected ? (
              <span className="oauth-connected-pill">
                <span className="auth-user-icon">👤</span>
                <span className="auth-email">{connectedEmail}</span>
                <button
                  type="button"
                  className="btn-oauth-disconnect"
                  onClick={handleDisconnectGoogle}
                  title="Disconnect Google Drive and Gmail account"
                >
                  Disconnect
                </button>
              </span>
            ) : (
              <button
                type="button"
                className="btn-oauth-connect"
                onClick={handleConnectGoogle}
                disabled={!isGoogleConfigured || isAuthorizing}
                title={
                  isGoogleConfigured
                    ? 'Connect Google Drive & Gmail via OAuth 2.0'
                    : 'Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in backend/.env to connect'
                }
              >
                {isAuthorizing ? 'Opening Google...' : '🔑 Connect Google Workspace'}
              </button>
            )}
          </div>
        </div>
      )}

      {oauthError && (
        <div className="oauth-error-callout" role="alert">
          <span>⚠️ {oauthError}</span>
          <button type="button" onClick={() => setOauthError(null)}>×</button>
        </div>
      )}

      <div className="status-actions">
        <button
          className="btn-refresh"
          onClick={onRefresh}
          disabled={isChecking}
          title="Re-check health of backend, database, Groq LLM, and external integrations"
        >
          {isChecking ? 'Checking...' : 'Refresh Status'}
        </button>
      </div>

      {/* Hints */}
      {!isDbOk && dbStatus?.data?.hint && (
        <div className="status-hint">
          <strong>Database Tip:</strong> {dbStatus.data.hint}
        </div>
      )}
      {!isGroqOk && groqStatus?.data?.hint && (
        <div className="status-hint">
          <strong>Groq LLM Tip:</strong> {groqStatus.data.hint}
        </div>
      )}
    </div>
  );
}
