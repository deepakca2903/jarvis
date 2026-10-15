import React, { useState, useEffect, useRef, useCallback } from 'react';

// Browser speech recognition vendor prefix fallback
const SpeechRecognition =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition || null
    : null;

export default function VoiceAssistant({
  onVoiceCommand,
  isExecuting,
  disabled,
  spokenText,
}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isEditingTranscript, setIsEditingTranscript] = useState(false);
  const [voiceError, setVoiceError] = useState(null);
  const [voiceOutputEnabled, setVoiceOutputEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const recognitionRef = useRef(null);

  // Check SpeechSynthesis support
  const isSynthesisSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const isRecognitionSupported = Boolean(SpeechRecognition);

  // Initialize Speech Recognition instance
  useEffect(() => {
    if (!SpeechRecognition) return;

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false; // Do not continuously record in the background
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setVoiceError(null);
      };

      recognition.onresult = (event) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
        setIsEditingTranscript(true);
      };

      recognition.onerror = (event) => {
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setVoiceError('Microphone permission denied. Please allow microphone access in your browser settings.');
        } else if (event.error === 'no-speech') {
          setVoiceError('No speech detected. Click the microphone and try speaking again.');
        } else if (event.error === 'audio-capture') {
          setVoiceError('No microphone hardware detected on this device.');
        } else if (event.error === 'network') {
          setVoiceError('Network error occurred during speech recognition.');
        } else {
          setVoiceError(`Speech recognition issue: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } catch (err) {
      console.warn('SpeechRecognition initialization error:', err);
      recognitionRef.current = null;
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (_) {}
      }
    };
  }, []);

  // Speak aloud via SpeechSynthesis when spokenText changes
  const speakResponse = useCallback(
    (text) => {
      if (!isSynthesisSupported || !voiceOutputEnabled || !text) return;

      try {
        window.speechSynthesis.cancel(); // Stop any pending speech
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.lang = 'en-US';

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn('SpeechSynthesis error:', err);
        setIsSpeaking(false);
      }
    },
    [isSynthesisSupported, voiceOutputEnabled]
  );

  // Automatically speak agent summary when updated
  useEffect(() => {
    if (spokenText) {
      speakResponse(spokenText);
    }
  }, [spokenText, speakResponse]);

  const stopSpeaking = () => {
    if (isSynthesisSupported) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const toggleListening = () => {
    if (!isRecognitionSupported) {
      setVoiceError(
        'Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari, or type your command.'
      );
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch (_) {}
      setIsListening(false);
    } else {
      setVoiceError(null);
      setTranscript('');
      setIsEditingTranscript(false);
      stopSpeaking();
      try {
        recognitionRef.current?.start();
      } catch (err) {
        console.warn('Error starting speech recognition:', err);
        setVoiceError('Could not start microphone: ' + err.message);
      }
    }
  };

  const handleSendTranscript = () => {
    const textToSend = transcript.trim();
    if (!textToSend || isExecuting || disabled) return;
    onVoiceCommand(textToSend);
    setTranscript('');
    setIsEditingTranscript(false);
  };

  const handleCancelTranscript = () => {
    setTranscript('');
    setIsEditingTranscript(false);
    if (isListening) {
      recognitionRef.current?.abort();
      setIsListening(false);
    }
  };

  return (
    <div className="voice-assistant-panel">
      <div className="voice-controls-bar">
        {/* Microphone Toggle Button */}
        <button
          type="button"
          className={`btn-voice-mic ${isListening ? 'mic-listening' : ''}`}
          onClick={toggleListening}
          disabled={disabled || isExecuting}
          title={
            isListening
              ? 'Listening... Click to stop voice input'
              : 'Click to speak a voice command to Jarvis'
          }
          aria-label={isListening ? 'Stop listening' : 'Start voice input'}
        >
          <span className="mic-icon">{isListening ? '🔴' : '🎙️'}</span>
          <span className="mic-label">
            {isListening ? 'Listening...' : 'Speak to Jarvis'}
          </span>
          {isListening && <span className="mic-pulse-ring" />}
        </button>

        {/* Voice Output (TTS) Controls */}
        <div className="voice-output-actions">
          {isSpeaking && (
            <button
              type="button"
              className="btn-stop-speaking"
              onClick={stopSpeaking}
              title="Stop speaking aloud immediately"
            >
              ⏹️ Stop Speaking
            </button>
          )}

          <button
            type="button"
            className={`btn-voice-toggle ${voiceOutputEnabled ? 'voice-on' : 'voice-off'}`}
            onClick={() => {
              if (isSpeaking) stopSpeaking();
              setVoiceOutputEnabled((prev) => !prev);
            }}
            title={voiceOutputEnabled ? 'Mute voice responses' : 'Enable voice responses'}
          >
            {voiceOutputEnabled ? '🔊 Spoken Responses: ON' : '🔇 Spoken Responses: OFF'}
          </button>
        </div>
      </div>

      {/* Voice Warning or Fallback Message */}
      {voiceError && (
        <div className="voice-error-alert" role="alert">
          <span className="alert-icon">⚠️</span>
          <span className="alert-text">{voiceError}</span>
          <button
            type="button"
            className="btn-clear-voice-error"
            onClick={() => setVoiceError(null)}
          >
            ×
          </button>
        </div>
      )}

      {/* Recognized Speech Transcript Preview & Edit Box */}
      {(isListening || isEditingTranscript) && (
        <div className="voice-transcript-card">
          <div className="transcript-header">
            <span className="transcript-title">
              {isListening ? '🎙️ Recognizing Speech...' : '📝 Review Recognized Speech:'}
            </span>
            <span className="transcript-hint">
              You can edit recognized text before sending.
            </span>
          </div>

          <textarea
            className="transcript-textarea"
            rows={2}
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Listening for your voice command..."
            disabled={isExecuting}
          />

          <div className="transcript-actions">
            <button
              type="button"
              className="btn-send-transcript"
              onClick={handleSendTranscript}
              disabled={!transcript.trim() || isExecuting}
            >
              {isExecuting ? 'Processing...' : '🚀 Send to Jarvis'}
            </button>
            <button
              type="button"
              className="btn-cancel-transcript"
              onClick={handleCancelTranscript}
              disabled={isExecuting}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
