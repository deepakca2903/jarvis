import React from 'react';
import { api } from '../services/api';

export default function ExecutionTimeline({ activeRun, isExecuting }) {
  if (!activeRun && !isExecuting) {
    return (
      <section className="timeline-card">
        <h2 className="section-title">
          <span className="icon">⏱️</span> Execution Timeline
        </h2>
        <div className="empty-state">
          No agent runs yet. Submit a natural-language or voice command above to watch Groq function calling in action.
        </div>
      </section>
    );
  }

  const {
    id,
    command,
    status = 'running',
    model = 'openai/gpt-oss-20b',
    steps = [],
    error,
    output,
    spoken_summary,
    goal_achieved,
    report_url,
  } = activeRun || {};

  return (
    <section className="timeline-card">
      <div className="timeline-header">
        <h2 className="section-title">
          <span className="icon">⏱️</span> Execution Timeline
        </h2>
        <div className="timeline-header-badges">
          {goal_achieved === true && (
            <span className="badge badge-goal-verified" title="Agent explicitly verified all target artifacts and database writes">
              🎯 GOAL VERIFIED
            </span>
          )}
          {goal_achieved === false && status !== 'running' && (
            <span className="badge badge-goal-unverified" title="Agent detected goal was not fully achieved">
              ⚠️ GOAL INCOMPLETE
            </span>
          )}
          <span className={`badge badge-${status}`}>
            {isExecuting ? 'EXECUTING...' : status.toUpperCase().replace('_', ' ')}
          </span>
        </div>
      </div>

      <div className="timeline-command-info">
        <div>
          <strong>Command:</strong> &ldquo;{command || (isExecuting ? 'Processing...' : '')}&rdquo;
        </div>
        <div className="timeline-pills">
          <span className="model-pill">LLM: {model}</span>
          {id && <span className="run-id-pill">Run: {id}</span>}
        </div>
      </div>

      {/* Voice Assistant Spoken Summary Callout */}
      {spoken_summary && (
        <div className="spoken-summary-callout">
          <div className="spoken-summary-header">
            <span className="speech-icon">🔊</span>
            <span className="speech-title">Spoken Voice Summary</span>
          </div>
          <p className="spoken-summary-text">&ldquo;{spoken_summary}&rdquo;</p>
        </div>
      )}

      {isExecuting && steps.length === 0 && (
        <div className="timeline-loading">
          <span className="spinner" />
          <span>Groq LLM is selecting allowlisted Python tools and orchestrating execution...</span>
        </div>
      )}

      {steps.length > 0 && (
        <ol className="steps-list">
          {steps.map((step, idx) => {
            const isRetry = step.retry_count > 0;
            const isVerify = step.tool_name === 'verify_action';
            const isStatusCheck = step.tool_name === 'workflow_status';

            return (
              <li key={step.step_id || idx} className={`step-item step-${step.status}`}>
                <div className="step-marker">{idx + 1}</div>
                <div className="step-content">
                  <div className="step-top">
                    <span className="step-tool">
                      {isVerify ? '🔍 ' : isStatusCheck ? '📊 ' : '⚙️ '}
                      {step.tool_name}
                    </span>
                    <span className={`step-badge badge-${step.status}`}>
                      {step.status.toUpperCase()}
                      {isRetry && ` (Retry #${step.retry_count})`}
                    </span>
                    {step.duration_ms != null && (
                      <span className="step-duration">{step.duration_ms}ms</span>
                    )}
                  </div>

                  {step.arguments && Object.keys(step.arguments).length > 0 && (
                    <details className="step-details">
                      <summary>Arguments (Secrets Redacted)</summary>
                      <pre>{JSON.stringify(step.arguments, null, 2)}</pre>
                    </details>
                  )}

                  {step.result && (
                    <details className="step-details" open>
                      <summary>
                        {isVerify
                          ? step.result.verified
                            ? '✅ Verified Artifact Result'
                            : '❌ Verification Check'
                          : 'Verified Tool Result'}
                      </summary>
                      <pre>
                        {typeof step.result === 'string'
                          ? step.result
                          : JSON.stringify(step.result, null, 2)}
                      </pre>
                    </details>
                  )}

                  {/* Staged Email Draft Card requiring explicit confirmation */}
                  {step.tool_name === 'draft_email' && step.result && step.result.status === 'draft_created' && (
                    <div className="email-draft-card">
                      <div className="email-draft-header">
                        <span className="email-draft-badge">✉️ GMAIL DRAFT STAGED</span>
                        <span className="email-draft-req">Confirmation Required</span>
                      </div>
                      <div className="email-draft-row">
                        <span className="email-draft-label">To:</span>
                        <span className="email-draft-val">{step.result.to || step.result.recipient}</span>
                      </div>
                      <div className="email-draft-row">
                        <span className="email-draft-label">Subject:</span>
                        <span className="email-draft-val">{step.result.subject}</span>
                      </div>
                      <div className="email-draft-body-block">
                        <span className="email-draft-label">Message Body:</span>
                        <pre className="email-draft-body-content">{step.result.body}</pre>
                      </div>
                      <div className="email-draft-notice">
                        ⚠️ <strong>Action Staged for User Review:</strong> Jarvis does not automatically send emails. This draft is saved in Gmail Drafts (ID: {step.result.draft_id}). Please review in Gmail before sending.
                      </div>
                    </div>
                  )}

                  {step.error && (
                    <div className="step-error-box">
                      <strong>Tool Error:</strong> {step.error}
                      {isRetry && <span> (Retried automatically once)</span>}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {/* Verified Generated Report Callout */}
      {report_url && (
        <div className="report-callout-banner">
          <div className="report-callout-info">
            <span className="callout-icon">📊</span>
            <div>
              <strong>Verified Report Generated</strong>
              <p>Artifact has been validated on disk and is available for download.</p>
            </div>
          </div>
          <a
            href={report_url.startsWith('http') ? report_url : `${api.baseUrl}${report_url}`}
            className="btn-download"
            target="_blank"
            rel="noreferrer"
            download
          >
            Download Report (.md)
          </a>
        </div>
      )}

      {/* Final AI Output */}
      {output && (
        <div className="run-final-output">
          <h3>Groq Jarvis Agent Response:</h3>
          <p>{output}</p>
        </div>
      )}

      {/* Fatal Run Error */}
      {error && (
        <div className="run-final-error">
          <h3>Execution Failed:</h3>
          <p>{error}</p>
        </div>
      )}
    </section>
  );
}
