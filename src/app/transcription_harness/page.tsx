'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Key } from 'lucide-react';

interface SessionData {
  client_secret?: {
    value: string;
  };
  error?: string;
}

export default function TranscriptionHarness() {
  const [ephemeralKey, setEphemeralKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<'DISCONNECTED' | 'CONNECTED'>('DISCONNECTED');

  const logClientEvent = (data: any, event: string) => {
    console.log(`[CLIENT EVENT] ${event}:`, data);
  };

  const logServerEvent = (data: any, event: string) => {
    console.log(`[SERVER EVENT] ${event}:`, data);
  };

  const fetchEphemeralKey = async (): Promise<string | null> => {
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

  const handleFetchKey = async () => {
    setIsLoading(true);
    setError(null);
    setEphemeralKey(null);

    try {
      const key = await fetchEphemeralKey();
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
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Transcription Harness</h1>
          <p className="text-muted-foreground">
            Test the OpenAI Realtime API session creation and ephemeral key generation
          </p>
        </div>

        {/* Status Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Session Status
              </CardTitle>
              <Badge variant={sessionStatus === 'CONNECTED' ? 'default' : 'outline'}>
                {sessionStatus}
              </Badge>
            </div>
            <CardDescription>
              Create a new OpenAI Realtime API session to get an ephemeral key
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={handleFetchKey}
              disabled={isLoading}
              className="w-full"
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

            {error && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-destructive text-sm font-medium">Error:</p>
                <p className="text-destructive text-sm">{error}</p>
              </div>
            )}

            {ephemeralKey && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Ephemeral Key:</p>
                <div className="p-4 bg-muted rounded-md">
                  <code className="text-sm break-all font-mono">
                    {ephemeralKey}
                  </code>
                </div>
                <p className="text-xs text-muted-foreground">
                  This key can be used to establish a WebSocket connection to the OpenAI Realtime API
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>How it works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              1. Click the "Fetch Ephemeral Key" button to create a new OpenAI Realtime API session
            </p>
            <p>
              2. The API will return an ephemeral key that can be used for WebSocket authentication
            </p>
            <p>
              3. This key is temporary and will expire after the session timeout
            </p>
            <p>
              4. Use this key to connect to the OpenAI Realtime API via WebSocket for live transcription
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 