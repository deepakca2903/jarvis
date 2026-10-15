import React from 'react';
import { api } from '../services/api';

export default function ReportDownload({ reports = [], onRefresh, isLoading }) {
  return (
    <section className="report-card">
      <div className="card-header-row">
        <h2 className="section-title">
          <span className="icon">📊</span> Generated Reports
        </h2>
        {onRefresh && (
          <button
            className="btn-refresh-small"
            onClick={onRefresh}
            disabled={isLoading}
            title="Refresh verified reports list"
          >
            {isLoading ? 'Checking...' : 'Refresh'}
          </button>
        )}
      </div>

      {reports.length === 0 ? (
        <div className="empty-state">
          No reports generated yet. Ask Jarvis to &ldquo;generate a report&rdquo; to build and verify markdown reports on disk.
        </div>
      ) : (
        <div className="reports-list">
          {reports.map((report, idx) => {
            const rawUrl = report.download_url || `/api/reports/${report.filename}`;
            const fullUrl = rawUrl.startsWith('http') ? rawUrl : `${api.baseUrl}${rawUrl}`;

            return (
              <div key={idx} className="report-item">
                <div className="report-icon">📄</div>
                <div className="report-info">
                  <span className="report-filename">{report.filename || report.name}</span>
                  <span className="report-meta">
                    {report.size_bytes ? `${(report.size_bytes / 1024).toFixed(1)} KB` : 'Verified file'} &bull; Verified on disk
                  </span>
                </div>
                <a
                  href={fullUrl}
                  className="btn-download"
                  download
                  target="_blank"
                  rel="noreferrer"
                >
                  Download
                </a>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
