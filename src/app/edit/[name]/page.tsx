'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Save, Loader2, CheckCircle, Brain, Pause, Mic, Square } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useRealtimeTranscription } from '@/hooks/useRealtimeTranscription';

interface PdfEditorProps {}

export default function PdfEditor({}: PdfEditorProps) {
  const params = useParams();
  const pdfName = params.name as string;
  const containerRef = useRef(null);
  const instanceRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string>('');
  const [isAiModeActive, setIsAiModeActive] = useState(false);

  // Transcription hook
  const {
    transcript,
    isRecording,
    sessionStatus,
    isWebSocketConnected,
    connectAndStartRecording,
    stopRecording,
    clearTranscript,
    error: transcriptionError
  } = useRealtimeTranscription();

  // Load PDF URL
  useEffect(() => {
    if (pdfName) {
      const url = `/api/pdfs/${pdfName}`;
      setPdfUrl(url);
    }
  }, [pdfName]);

  // Initialize NutrientViewer
  useEffect(() => {
    const container = containerRef.current;
    console.log('container', container);
    console.log('pdfUrl', pdfUrl);
    console.log('typeof window', typeof window);

    if (container && pdfUrl && typeof window !== 'undefined') {
      console.log('NutrientViewer loading');
      const { NutrientViewer } = window;
      
      if (NutrientViewer) {
        console.log('NutrientViewer loaded');
        setIsLoading(true);
        setError('');
        
        NutrientViewer.load({
          container,
          document: pdfUrl,
        })
        .then((instance) => {
          instanceRef.current = instance;
          setIsLoading(false);

          instance.addEventListener("annotations.focus", function (annotationFocusEvent) {
            console.log(annotationFocusEvent.annotation.toJS());
          });

          instance.addEventListener("annotations.blur", function (annotationBlurEvent) {
            console.log(annotationBlurEvent.annotation.toJS());
          })
        })
        .catch((error: Error) => {
          setError('Failed to load PDF');
          setIsLoading(false);
          console.error('PDF load error:', error);
        });
      } else {
        setError('NutrientViewer not available');
        setIsLoading(false);
      }
    }

    return () => {
      if (container && typeof window !== 'undefined') {
        const { NutrientViewer } = window as any;
        NutrientViewer?.unload(container);
        instanceRef.current = null;
      }
    };
  }, [pdfUrl]);

  const handleSave = async () => {
    if (!instanceRef.current) {
      alert('PDF not loaded yet. Please wait for the PDF to load before saving.');
      return;
    }

    setIsSaving(true);
    setSaveStatus('saving');
    try {
      // Export PDF using the stored instance
      const documentBuffer = await instanceRef.current.exportPDF();
      
      // Create a blob from the buffer
      const blob = new Blob([documentBuffer], { type: 'application/pdf' });
      
      // Create FormData to send to the API
      const formData = new FormData();
      formData.append('file', blob, `${pdfName}.pdf`);
      
      // Send to save API endpoint
      const response = await fetch(`/api/pdfs/${pdfName}/save`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save PDF');
      }
      
      const result = await response.json();
      console.log('PDF saved successfully:', result);
      setSaveStatus('success');
      
      // Reset to idle after 2 seconds
      setTimeout(() => {
        setSaveStatus('idle');
      }, 2000);
      
    } catch (error) {
      console.error('Save error:', error);
      setSaveStatus('error');
      alert(`Failed to save PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Reset to idle after showing error
      setTimeout(() => {
        setSaveStatus('idle');
      }, 1000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAiModeToggle = async () => {
    if (!isAiModeActive) {
      // Start AI mode - both screen capture AND transcription
      try {
        // 1. Start screen capture (existing functionality)
        const displayMediaOptions: DisplayMediaStreamOptions & { 
          preferCurrentTab?: boolean;
          selfBrowserSurface?: string;
          surfaceSwitching?: string;
        } = { 
          video: {
            displaySurface: "browser"
          },
          preferCurrentTab: true,
          selfBrowserSurface: "include",
          surfaceSwitching: "exclude"
        };
        
        const stream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
        streamRef.current = stream;
        
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            console.log('Screen recording data available:', event.data);
            // Here you would process the video data for AI analysis
          }
        };
        
        mediaRecorder.onstop = () => {
          console.log('Screen recording stopped');
        };
        
        // Handle stream ending (user stops sharing)
        stream.getVideoTracks()[0].addEventListener('ended', () => {
          console.log('Screen sharing ended by user');
          setIsAiModeActive(false);
          streamRef.current = null;
          mediaRecorderRef.current = null;
          // Also stop transcription when screen sharing ends
          if (isRecording) {
            stopRecording();
          }
        });
        
        mediaRecorder.start(1000); // Capture data every second
        
        // 2. Start transcription
        await connectAndStartRecording();

        setIsAiModeActive(true);
        console.log('AI mode started - screen capture and transcription active');
        
      } catch (error) {
        console.error('Failed to start AI mode:', error);
        alert('Failed to start AI mode. Please ensure you grant permission to share your screen and access your microphone.');
      }
    } else {
      // Stop AI mode - both screen capture AND transcription
      
      // Stop screen capture
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      mediaRecorderRef.current = null;
      
      // Stop transcription
      console.log(isRecording);
      if (isRecording) {
        stopRecording();
      }
      
      setIsAiModeActive(false);
      console.log('AI mode stopped');
    }
  };

  const displayName = pdfName ? pdfName.replace(/-/g, ' ') : '';

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Link href="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{displayName}</h1>
            <p className="text-muted-foreground">Edit your PDF document</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button 
            onClick={handleAiModeToggle}
            variant={isAiModeActive ? "default" : "outline"}
            size="sm"
          >
            {isAiModeActive ? (
              <Pause className="mr-2 h-3 w-3" />
            ) : (
              <Brain className="mr-2 h-3 w-3" />
            )}
            AI Mode
          </Button>
          <Button 
            onClick={handleSave}
            disabled={isSaving || saveStatus === 'success'}
            size="sm"
          >
            {saveStatus === 'saving' && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
            {saveStatus === 'success' && <CheckCircle className="mr-2 h-3 w-3" />}
            {(saveStatus === 'idle' || saveStatus === 'error') && <Save className="mr-2 h-3 w-3" />}
            Save
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex gap-6 transition-all duration-500 ease-in-out">
        {/* PDF Viewer */}
        <div className={`transition-all duration-500 ease-in-out ${
          isAiModeActive ? 'w-2/3' : 'w-full'
        }`}>
          <Card>
            <CardContent className="p-0">
              {/* Wrapper for container and overlays */}
              <div 
                style={{ 
                  height: "80vh", 
                  width: "100%",
                  minHeight: "600px",
                  position: "relative"
                }} 
              >
                {/* Empty container for NutrientViewer - must be empty! */}
                <div 
                  ref={containerRef} 
                  style={{ 
                    height: "100%", 
                    width: "100%"
                  }} 
                />
                
                {/* Loading overlay */}
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10">
                    <div className="text-muted-foreground">Loading PDF...</div>
                  </div>
                )}
                
                {/* Error overlay */}
                {error && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10">
                    <div className="text-destructive">{error}</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Transcript Panel - Slides in from right */}
        <div className={`transition-all duration-500 ease-in-out overflow-hidden ${
          isAiModeActive ? 'w-1/3 opacity-100 translate-x-0' : 'w-0 opacity-0 translate-x-full'
        }`}>
          {isAiModeActive && (
            <Card className="h-full">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    AI Transcript
                    <div className="flex items-center gap-1">
                      {isRecording && (
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                      )}
                      {sessionStatus === 'CONNECTED' && (
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      )}
                    </div>
                  </CardTitle>
                  <div className="flex gap-1">
                    <Button
                      onClick={clearTranscript}
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs"
                    >
                      Clear
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Live transcription of your voice
                </p>
              </CardHeader>
              <CardContent className="pt-0">
                {transcriptionError && (
                  <div className="mb-3 p-2 bg-destructive/10 border border-destructive/20 rounded text-xs">
                    <p className="text-destructive">{transcriptionError}</p>
                  </div>
                )}
                
                <div 
                  className="h-[calc(80vh-200px)] overflow-y-auto p-3 bg-muted rounded-md text-sm"
                  style={{ minHeight: "400px" }}
                >
                  <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed">
                    {transcript || (
                      <span className="text-muted-foreground italic">
                        {isRecording 
                          ? "Listening... Start speaking to see transcription here."
                          : sessionStatus === 'CONNECTED' 
                          ? "AI Mode active. Microphone ready."
                          : "Connecting to transcription service..."
                        }
                      </span>
                    )}
                  </pre>
                </div>
                
                {/* Status indicator */}
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Mic className="w-3 h-3" />
                    <span>
                      {isRecording ? 'Recording' : 'Standby'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className={`w-2 h-2 rounded-full ${
                      sessionStatus === 'CONNECTED' ? 'bg-green-500' : 'bg-gray-400'
                    }`} />
                    <span>{sessionStatus}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
} 