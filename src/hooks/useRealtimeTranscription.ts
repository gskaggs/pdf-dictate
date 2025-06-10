'use client';

import { useState, useRef, useCallback } from 'react';

export interface SessionData {
  client_secret?: {
    value: string;
  };
  error?: string;
}

export interface EventLog {
  id: string;
  timestamp: string;
  type: string;
  direction: 'incoming' | 'outgoing';
  data: any;
}

export type SessionStatus = 'DISCONNECTED' | 'CONNECTED';

export interface UseRealtimeTranscriptionReturn {
  // State
  ephemeralKey: string | null;
  error: string | null;
  sessionStatus: SessionStatus;
  isRecording: boolean;
  transcript: string;
  eventLogs: EventLog[];
  isLoading: boolean;
  
  // Actions
  fetchEphemeralKey: () => Promise<void>;
  connectWebSocket: () => Promise<void>;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  clearLogs: () => void;
  clearTranscript: () => void;
  clearError: () => void;
  
  // WebSocket state
  isWebSocketConnected: boolean;
}

export const useRealtimeTranscription = (): UseRealtimeTranscriptionReturn => {
  // State
  const [ephemeralKey, setEphemeralKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('DISCONNECTED');
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState<string>('');
  const [eventLogs, setEventLogs] = useState<EventLog[]>([]);
  
  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Computed state
  const isWebSocketConnected = wsRef.current?.readyState === WebSocket.OPEN;

  // Logging functions
  const logClientEvent = (data: any, event: string) => {
    console.log(`[CLIENT EVENT] ${event}:`, data);
  };

  const logServerEvent = (data: any, event: string) => {
    console.log(`[SERVER EVENT] ${event}:`, data);
  };

  const addEventLog = useCallback((type: string, direction: 'incoming' | 'outgoing', data: any) => {
    const eventLog: EventLog = {
      id: Date.now() + Math.random().toString(),
      timestamp: new Date().toLocaleTimeString(),
      type,
      direction,
      data
    };
    setEventLogs(prev => [...prev.slice(-49), eventLog]); // Keep last 50 events
  }, []);

  // Fetch ephemeral key from API
  const fetchEphemeralKeyInternal = async (): Promise<string | null> => {
    logClientEvent({ url: "/session" }, "fetch_session_token_request");
    
    try {
      const tokenResponse = await fetch("/api/session");
      const data: SessionData = await tokenResponse.json();
      
      logServerEvent(data, "fetch_session_token_response");

      if (!data.client_secret?.value) {
        logClientEvent(data, "error.no_ephemeral_key");
        console.error("No ephemeral key provided by the server");
        setSessionStatus("DISCONNECTED");
        return null;
      }

      return data.client_secret.value;
    } catch (error) {
      console.error("Error fetching ephemeral key:", error);
      setSessionStatus("DISCONNECTED");
      return null;
    }
  };

  const fetchEphemeralKey = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setEphemeralKey(null);

    try {
      const key = await fetchEphemeralKeyInternal();
      if (key) {
        setEphemeralKey(key);
        setSessionStatus("CONNECTED");
      } else {
        setError("Failed to fetch ephemeral key");
        setSessionStatus("DISCONNECTED");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
      setSessionStatus("DISCONNECTED");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const connectWebSocket = useCallback(async () => {
    if (!ephemeralKey) {
      setError("No ephemeral key available");
      return;
    }

    try {
      const wsUrl = `wss://api.openai.com/v1/realtime?intent=transcription`;
      wsRef.current = new WebSocket(wsUrl, [
        "realtime",
        `openai-insecure-api-key.${ephemeralKey}`,
        "openai-beta.realtime-v1"
      ]);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        addEventLog('connection.opened', 'incoming', { status: 'connected' });
        
        // Send session update
        const sessionUpdate = {
          type: "transcription_session.update",
          session: {
            input_audio_transcription: {
              model: "gpt-4o-mini-transcribe",
              language: "en"
            },
            turn_detection: {
              type: "server_vad",
              silence_duration_ms: 800,
              threshold: 0.5
            }
          }
        };
        
        wsRef.current?.send(JSON.stringify(sessionUpdate));
        addEventLog('transcription_session.update', 'outgoing', sessionUpdate);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          addEventLog(data.type, 'incoming', data);
          
          // Handle different message types
          switch (data.type) {
            case 'conversation.item.input_audio_transcription.delta':
              if (data.transcript) {
                setTranscript(prev => prev + data.transcript);
              }
              break;
            case 'conversation.item.input_audio_transcription.completed':
              if (data.transcript) {
                setTranscript(prev => prev + '\n' + data.transcript);
              }
              break;
            case 'error':
              setError(`WebSocket error: ${data.error?.message || 'Unknown error'}`);
              break;
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        addEventLog('connection.error', 'incoming', { error: error.toString() });
        setError('WebSocket connection error');
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket closed');
        addEventLog('connection.closed', 'incoming', { status: 'closed' });
        setIsRecording(false);
      };

    } catch (err) {
      setError(`Failed to connect WebSocket: ${err}`);
    }
  }, [ephemeralKey, addEventLog]);

  const startRecording = useCallback(async () => {
    try {
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      streamRef.current = stream;
      
      // Create audio context
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });
      sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
      
      // Create processor for audio data
      processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);
      
      processorRef.current.onaudioprocess = (event) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
        
        const inputBuffer = event.inputBuffer;
        const inputData = inputBuffer.getChannelData(0);
        
        // Convert float32 to int16
        const int16Array = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          int16Array[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
        }
        
        // Convert to base64
        const bytes = new Uint8Array(int16Array.buffer);
        const base64 = btoa(String.fromCharCode(...bytes));
        
        // Send audio data
        const audioMessage = {
          type: 'input_audio_buffer.append',
          audio: base64
        };
        
        wsRef.current.send(JSON.stringify(audioMessage));
        addEventLog('input_audio_buffer.append', 'outgoing', { size: base64.length });
      };
      
      sourceRef.current.connect(processorRef.current);
      processorRef.current.connect(audioContextRef.current.destination);
      
      setIsRecording(true);
      addEventLog('recording.started', 'outgoing', { status: 'started' });
      
    } catch (err) {
      setError(`Failed to start recording: ${err}`);
    }
  }, [addEventLog]);

  const stopRecording = useCallback(() => {
    // Stop audio processing
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    setIsRecording(false);
    addEventLog('recording.stopped', 'outgoing', { status: 'stopped' });
  }, [addEventLog]);

  const clearLogs = useCallback(() => {
    setEventLogs([]);
  }, []);

  const clearTranscript = useCallback(() => {
    setTranscript('');
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    ephemeralKey,
    error,
    sessionStatus,
    isRecording,
    transcript,
    eventLogs,
    isLoading,
    
    // Actions
    fetchEphemeralKey,
    connectWebSocket,
    startRecording,
    stopRecording,
    clearLogs,
    clearTranscript,
    clearError,
    
    // WebSocket state
    isWebSocketConnected,
  };
}; 