const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/**
 * Standard fetch wrapper with timeout and JSON parsing.
 */
async function fetchWithTimeout(endpoint, options = {}, timeoutMs = 10000) {
  const url = `${API_BASE_URL}${endpoint}`;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      signal: controller.signal,
    });

    const data = await response.json().catch(() => null);

    return {
      ok: response.ok,
      status: response.status,
      data,
    };
  } catch (error) {
    if (error.name === 'AbortError') {
      return {
        ok: false,
        status: 408,
        data: { error: `Request timed out after ${timeoutMs}ms` },
      };
    }
    return {
      ok: false,
      status: 0,
      data: { error: error.message || 'Network connection failed' },
    };
  } finally {
    clearTimeout(id);
  }
}

export const api = {
  baseUrl: API_BASE_URL,

  async getHealth() {
    return fetchWithTimeout('/api/health');
  },

  async getDbHealth() {
    return fetchWithTimeout('/api/health/db');
  },

  async getGroqHealth() {
    return fetchWithTimeout('/api/health/groq');
  },

  async executeCommand(command, taskId = null) {
    // LLM multi-step tool calls can take 15-45 seconds, allocate 60s timeout
    return fetchWithTimeout(
      '/api/agent/command',
      {
        method: 'POST',
        body: JSON.stringify({ command, task_id: taskId }),
      },
      60000
    );
  },

  async getTasks(status = null, priority = null) {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (priority) params.append('priority', priority);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return fetchWithTimeout(`/api/tasks${qs}`);
  },

  async getReports() {
    return fetchWithTimeout('/api/reports');
  },

  async getWorkflowStatus(runId) {
    return fetchWithTimeout(`/api/agent/workflow/${encodeURIComponent(runId)}`);
  },

  async getIntegrationsStatus() {
    return fetchWithTimeout('/api/integrations/status');
  },

  async getGoogleAuthStatus() {
    return fetchWithTimeout('/api/auth/google/status');
  },

  async getGoogleLoginUrl() {
    return fetchWithTimeout('/api/auth/google/login');
  },

  async disconnectGoogleAuth() {
    return fetchWithTimeout('/api/auth/google/disconnect', { method: 'POST' });
  },

  async getGoogleDiagnostics() {
    return fetchWithTimeout('/api/auth/google/diagnostics');
  },

  async testGmailDraft() {
    return fetchWithTimeout('/api/auth/google/test-draft', { method: 'POST' });
  },

  async testDriveUpload() {
    return fetchWithTimeout('/api/auth/google/test-upload', { method: 'POST' });
  },

  getReportDownloadUrl(filename) {
    return `${API_BASE_URL}/api/reports/${encodeURIComponent(filename)}`;
  },
};
