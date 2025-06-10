'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Key, Mic, Square } from 'lucide-react';
import { useRealtimeTranscription } from '@/hooks/useRealtimeTranscription';

export default function TranscriptionHarness() {
  const {
    // State
    ephemeralKey,
    error,
    sessionStatus,
    isRecording,
    transcript,
    eventLogs,
    isLoading,
    isWebSocketConnected,
    
    // Actions
    fetchEphemeralKey,
    connectWebSocket,
    startRecording,
    stopRecording,
    clearLogs,
    clearTranscript,
  } = useRealtimeTranscription();

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Transcription Harness</h1>
          <p className="text-muted-foreground">
            Test the OpenAI Realtime API with live audio transcription
          </p>
        </div>

        {/* Control Panel */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Session Control
              </CardTitle>
              <Badge variant={sessionStatus === 'CONNECTED' ? 'default' : 'outline'}>
                {sessionStatus}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button 
                onClick={fetchEphemeralKey}
                disabled={isLoading}
                variant="outline"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Session...
                  </>
                ) : (
                  'Fetch Ephemeral Key'
                )}
              </Button>

              <Button 
                onClick={connectWebSocket}
                disabled={!ephemeralKey || isLoading}
              >
                Connect WebSocket
              </Button>

              <Button 
                onClick={isRecording ? stopRecording : startRecording}
                disabled={!isWebSocketConnected}
                variant={isRecording ? "destructive" : "default"}
              >
                {isRecording ? (
                  <>
                    <Square className="mr-2 h-4 w-4" />
                    Stop Recording
                  </>
                ) : (
                  <>
                    <Mic className="mr-2 h-4 w-4" />
                    Start Recording
                  </>
                )}
              </Button>
            </div>

            {error && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-destructive text-sm font-medium">Error:</p>
                <p className="text-destructive text-sm">{error}</p>
              </div>
            )}

            {ephemeralKey && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Ephemeral Key:</p>
                <div className="p-2 bg-muted rounded-md">
                  <code className="text-xs break-all font-mono">
                    {ephemeralKey.substring(0, 50)}...
                  </code>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Main Content - Split View */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Transcript */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Live Transcript</CardTitle>
                <Button onClick={clearTranscript} size="sm" variant="outline">
                  Clear
                </Button>
              </div>
              <CardDescription>
                Real-time transcription from your microphone
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="min-h-[400px] max-h-[600px] overflow-y-auto p-4 bg-muted rounded-md">
                <pre className="whitespace-pre-wrap text-sm font-mono">
                  {transcript || 'Transcript will appear here when you start recording...'}
                </pre>
              </div>
            </CardContent>
          </Card>

          {/* Right: Event Logs */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Event Logs</CardTitle>
                <Button onClick={clearLogs} size="sm" variant="outline">
                  Clear
                </Button>
              </div>
              <CardDescription>
                WebSocket events and messages ({eventLogs.length})
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="min-h-[400px] max-h-[600px] overflow-y-auto space-y-2">
                {eventLogs.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Event logs will appear here...</p>
                ) : (
                  eventLogs.map((log) => (
                    <div
                      key={log.id}
                      className={`p-2 rounded text-xs border-l-4 ${
                        log.direction === 'incoming' 
                          ? 'border-l-blue-500 bg-blue-50 dark:bg-blue-950' 
                          : 'border-l-green-500 bg-green-50 dark:bg-green-950'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{log.type}</span>
                        <span className="text-muted-foreground">{log.timestamp}</span>
                      </div>
                      <pre className="whitespace-pre-wrap text-xs overflow-x-auto">
                        {JSON.stringify(log.data, null, 2)}
                      </pre>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 