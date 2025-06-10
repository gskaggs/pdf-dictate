'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Mic, Square, Loader2 } from 'lucide-react';
import { useRealtimeTranscription } from '@/hooks/useRealtimeTranscription';

interface TranscriptDisplayProps {
  title?: string;
  description?: string;
  showControls?: boolean;
  className?: string;
}

export default function TranscriptDisplay({ 
  title = "Live Transcript",
  description = "Real-time transcription from your microphone",
  showControls = true,
  className = ""
}: TranscriptDisplayProps) {
  const {
    // State
    transcript,
    isRecording,
    sessionStatus,
    isLoading,
    error,
    isWebSocketConnected,
    
    // Actions
    fetchEphemeralKey,
    connectWebSocket,
    startRecording,
    stopRecording,
    clearTranscript,
  } = useRealtimeTranscription();

  const initializeSession = async () => {
    try {
      await fetchEphemeralKey();
      await connectWebSocket();
    } catch (err) {
      console.error('Failed to initialize session:', err);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {title}
              <Badge variant={sessionStatus === 'CONNECTED' ? 'default' : 'outline'}>
                {sessionStatus}
              </Badge>
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          
          {showControls && (
            <div className="flex gap-2">
              {!isWebSocketConnected && (
                <Button 
                  onClick={initializeSession}
                  disabled={isLoading}
                  size="sm"
                  variant="outline"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    'Connect'
                  )}
                </Button>
              )}
              
              {isWebSocketConnected && (
                <Button 
                  onClick={isRecording ? stopRecording : startRecording}
                  size="sm"
                  variant={isRecording ? "destructive" : "default"}
                >
                  {isRecording ? (
                    <>
                      <Square className="mr-2 h-3 w-3" />
                      Stop
                    </>
                  ) : (
                    <>
                      <Mic className="mr-2 h-3 w-3" />
                      Record
                    </>
                  )}
                </Button>
              )}
              
              <Button onClick={clearTranscript} size="sm" variant="outline">
                Clear
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {error && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-destructive text-sm">{error}</p>
          </div>
        )}
        
        <div className="min-h-[200px] max-h-[400px] overflow-y-auto p-4 bg-muted rounded-md">
          <pre className="whitespace-pre-wrap text-sm font-mono">
            {transcript || 'Transcript will appear here when you start recording...'}
          </pre>
        </div>
      </CardContent>
    </Card>
  );
} 