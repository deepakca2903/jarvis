import React from 'react';

export default function TaskHistory({ tasks = [], isLoading, onRefresh }) {
  return (
    <section className="task-history-card">
      <div className="card-header-row">
        <h2 className="section-title">
          <span className="icon">📋</span> Task History (MongoDB)
        </h2>
        <button
          className="btn-refresh-small"
          onClick={onRefresh}
          disabled={isLoading}
          title="Refresh task list from MongoDB"
        >
          {isLoading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {tasks.length === 0 ? (
        <div className="empty-state">
          No tasks recorded in MongoDB yet. Ask Jarvis to create tasks to persist them.
        </div>
      ) : (
        <div className="tasks-grid">
          {tasks.map((task) => (
            <div key={task.id} className="task-card">
              <div className="task-card-header">
                <div className="badge-group">
                  <span className={`task-badge priority-${task.priority || 'medium'}`}>
                    {(task.priority || 'medium').toUpperCase()}
                  </span>
                  {task.deadline && (
                    <span className="deadline-badge">
                      📅 {task.deadline.slice(0, 10)}
                    </span>
                  )}
                </div>
                <span className={`task-status-badge status-${task.status || 'pending'}`}>
                  {task.status || 'pending'}
                </span>
              </div>

              <h3 className="task-title">{task.title}</h3>

              {task.description && (
                <p className="task-desc">{task.description}</p>
              )}

              <div className="task-footer">
                <span className="task-id">ID: {task.id}</span>
                <span className="task-time">
                  {task.created_at ? new Date(task.created_at).toLocaleTimeString() : ''}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
