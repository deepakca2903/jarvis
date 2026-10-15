import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import StatusBanner from './StatusBanner';
import ErrorMessage from './ErrorMessage';
import CommandInput from './CommandInput';
import ExecutionTimeline from './ExecutionTimeline';
import TaskHistory from './TaskHistory';
import ReportDownload from './ReportDownload';

export default function Dashboard() {
  const [backendStatus, setBackendStatus] = useState(null);
  const [dbStatus, setDbStatus] = useState(null);
  const [groqStatus, setGroqStatus] = useState(null);
  const [integrationsStatus, setIntegrationsStatus] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState(null);

  // Active run state
  const [activeRun, setActiveRun] = useState(null);
  const [isExecuting, setIsExecuting] = useState(false);

  // Real tasks and verified reports state
  const [tasks, setTasks] = useState([]);
  const [reports, setReports] = useState([]);

  // Fetch all tasks from MongoDB
  const fetchTasks = useCallback(async () => {
    try {
      const res = await api.getTasks();
      if (res.ok && res.data?.tasks) {
        setTasks(res.data.tasks);
      }
    } catch (err) {
      console.warn('Could not load tasks:', err);
    }
  }, []);

  // Fetch verified reports from backend
  const fetchReports = useCallback(async () => {
    try {
      const res = await api.getReports();
      if (res.ok && Array.isArray(res.data)) {
        setReports(res.data);
      }
    } catch (err) {
      console.warn('Could not load reports:', err);
    }
  }, []);

  // Comprehensive health, connectivity, and integrations check
  const checkConnectivity = useCallback(async () => {
    setIsChecking(true);
    setError(null);

    try {
      const [bHealth, dHealth, gHealth, iHealth] = await Promise.all([
        api.getHealth(),
        api.getDbHealth(),
        api.getGroqHealth(),
        api.getIntegrationsStatus(),
      ]);

      setBackendStatus(bHealth);
      setDbStatus(dHealth);
      setGroqStatus(gHealth);
      if (iHealth.ok && iHealth.data) {
        setIntegrationsStatus(iHealth.data);
      }

      // Also refresh tasks & reports
      await Promise.all([fetchTasks(), fetchReports()]);

      if (!bHealth.ok) {
        setError({
          title: 'Backend Unreachable',
          message: 'Unable to connect to FastAPI backend at ' + api.baseUrl,
          hint: 'Start the FastAPI backend: cd backend; .venv\\Scripts\\uvicorn app.main:app --reload --port 8000',
        });
      } else if (!dHealth.ok || dHealth.data?.status !== 'connected') {
        setError({
          title: 'MongoDB Disconnected',
          message: dHealth.data?.error || 'Database ping timed out or failed.',
          hint: dHealth.data?.hint || 'Ensure MongoDB is running or check MONGO_URI in backend/.env.',
        });
      } else if (!gHealth.ok || gHealth.data?.status !== 'connected') {
        setError({
          title: 'Groq LLM Offline',
          message: gHealth.data?.error || 'Groq API request failed.',
          hint: gHealth.data?.hint || 'Check GROQ_API_KEY in backend/.env.',
        });
      }
    } catch (err) {
      setError({
        title: 'Network Error',
        message: err.message || 'Unknown network error',
      });
    } finally {
      setIsChecking(false);
    }
  }, [fetchTasks, fetchReports]);

  useEffect(() => {
    // Check for Google OAuth callback parameters
    const params = new URLSearchParams(window.location.search);
    const authParam = params.get('auth');
    if (authParam === 'success') {
      window.history.replaceState({}, document.title, window.location.pathname);
      checkConnectivity();
    } else if (authParam === 'failed') {
      const authErr = params.get('error') || 'Google authorization was cancelled or failed.';
      window.history.replaceState({}, document.title, window.location.pathname);
      setError({
        title: 'Google Authorization Failed',
        message: authErr,
        hint: 'Verify your Google OAuth Client ID, Secret, and Authorized Redirect URIs in Google Cloud Console.',
      });
      checkConnectivity();
    } else {
      checkConnectivity();
    }
  }, [checkConnectivity]);

  // Handle command submission with real Groq LLM tool calling
  const handleCommandSubmit = async (commandText) => {
    if (!backendStatus?.ok) {
      setError({
        title: 'Backend Offline',
        message: 'Cannot execute commands while FastAPI backend is unreachable.',
        hint: 'Start the backend via PowerShell: python -m uvicorn app.main:app --reload --port 8000',
      });
      return;
    }

    if (dbStatus?.data?.status !== 'connected') {
      setError({
        title: 'Database Disconnected',
        message: 'MongoDB is required to retrieve and persist tasks and agent runs.',
        hint: 'Check your MongoDB connection in backend/.env.',
      });
      return;
    }

    if (groqStatus?.data?.status !== 'connected') {
      setError({
        title: 'Groq LLM Not Connected',
        message: groqStatus?.data?.error || 'Groq connection is offline.',
        hint: groqStatus?.data?.hint || 'Set a valid GROQ_API_KEY in backend/.env.',
      });
      return;
    }

    setIsExecuting(true);
    setError(null);

    // Initial placeholder timeline state
    setActiveRun({
      id: 'running...',
      command: commandText,
      status: 'running',
      model: groqStatus.data.model || 'openai/gpt-oss-20b',
      steps: [],
      output: null,
      spoken_summary: null,
      goal_achieved: null,
    });

    try {
      const res = await api.executeCommand(commandText);

      if (res.ok && res.data) {
        setActiveRun(res.data);
        // Refresh tasks and reports immediately after run
        await Promise.all([fetchTasks(), fetchReports()]);
      } else {
        const errorDetail = res.data?.detail || res.data?.error || 'Command execution failed.';
        setError({
          title: 'Agent Execution Failed',
          message: errorDetail,
          hint: 'Inspect backend terminal logs for additional diagnostic details.',
        });
        setActiveRun((prev) => ({
          ...prev,
          status: 'failed',
          error: errorDetail,
        }));
      }
    } catch (err) {
      setError({
        title: 'Execution Error',
        message: err.message || 'Failed to communicate with agent service.',
      });
      setActiveRun((prev) => ({
        ...prev,
        status: 'failed',
        error: err.message,
      }));
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-brand">
          <div className="jarvis-logo-ring">
            <span className="jarvis-core" />
          </div>
          <div>
            <h1 className="header-title">JARVIS AI AGENT</h1>
            <p className="header-tagline">
              Autonomous Voice Agent &bull; Groq (<code>openai/gpt-oss-20b</code>) &bull; FastAPI &bull; MongoDB
            </p>
          </div>
        </div>
      </header>

      {/* Connectivity & Integrations Status Banner */}
      <StatusBanner
        backendStatus={backendStatus}
        dbStatus={dbStatus}
        groqStatus={groqStatus}
        integrationsStatus={integrationsStatus}
        onRefresh={checkConnectivity}
        isChecking={isChecking}
      />

      {/* Error Alert Display */}
      <ErrorMessage error={error} onDismiss={() => setError(null)} />

      {/* Responsive Grid Layout */}
      <main className="dashboard-main-grid">
        <div className="main-left-col">
          <CommandInput
            onSubmit={handleCommandSubmit}
            isLoading={isExecuting}
            disabled={!backendStatus?.ok || isExecuting}
            spokenText={activeRun?.spoken_summary}
          />

          <ExecutionTimeline activeRun={activeRun} isExecuting={isExecuting} />
        </div>

        <div className="main-right-col">
          <TaskHistory
            tasks={tasks}
            isLoading={isChecking}
            onRefresh={fetchTasks}
          />

          <ReportDownload
            reports={reports}
            onRefresh={fetchReports}
            isLoading={isChecking}
          />
        </div>
      </main>
    </div>
  );
}
