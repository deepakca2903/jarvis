import React, { useState } from 'react';
import VoiceAssistant from './VoiceAssistant';

const SUGGESTIONS = [
  'List my pending tasks, prioritize them by deadline, and generate a report.',
  'Create a critical task: Fix authentication bug with deadline 2026-10-18',
  'Create a high-priority task: Deploy API to staging with deadline 2026-10-22',
  'List all current tasks and summarize their status',
];

export default function CommandInput({ onSubmit, isLoading, disabled, spokenText }) {
  const [command, setCommand] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!command.trim() || isLoading || disabled) return;
    onSubmit(command.trim());
    setCommand('');
  };

  const handleSuggestionClick = (prompt) => {
    setCommand(prompt);
  };

  const handleVoiceCommand = (voiceText) => {
    onSubmit(voiceText);
  };

  return (
    <section className="command-input-card">
      <div className="command-header-row">
        <h2 className="section-title">
          <span className="icon">💬</span> Command Jarvis
        </h2>
      </div>
      <p className="section-subtitle">
        Enter natural-language instructions or speak into your microphone. Groq LLM (<code>openai/gpt-oss-20b</code>) selects allowlisted Python tools, executes multi-step dependent operations, and verifies goal achievement.
      </p>

      {/* Voice Assistant Module (Speech Recognition & Spoken Output) */}
      <VoiceAssistant
        onVoiceCommand={handleVoiceCommand}
        isExecuting={isLoading}
        disabled={disabled}
        spokenText={spokenText}
      />

      <form onSubmit={handleSubmit} className="command-form">
        <div className="input-row">
          <input
            type="text"
            className="command-field"
            placeholder="Type a natural language instruction or use the microphone above..."
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            disabled={isLoading || disabled}
          />
          <button
            type="submit"
            className="btn-submit"
            disabled={!command.trim() || isLoading || disabled}
          >
            {isLoading ? 'Executing...' : 'Send Command'}
          </button>
        </div>
      </form>

      <div className="suggestions-container">
        <span className="suggestions-label">Try Multi-Step Prompts:</span>
        <div className="suggestions-chips">
          {SUGGESTIONS.map((item, idx) => (
            <button
              key={idx}
              type="button"
              className="chip-btn"
              onClick={() => handleSuggestionClick(item)}
              disabled={isLoading || disabled}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
