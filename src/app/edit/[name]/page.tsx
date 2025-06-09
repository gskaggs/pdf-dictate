'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Save, Loader2, CheckCircle, Brain, Pause } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

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
          console.log('NutrientViewer instance', instance);
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
      // Start AI mode
      try {
        // Use proper DisplayMediaStreamOptions with type casting for experimental features
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
          setIsAiModeActive(false);
        };
        
        // Handle stream ending (user stops sharing)
        stream.getVideoTracks()[0].addEventListener('ended', () => {
          console.log('Screen sharing ended by user');
          setIsAiModeActive(false);
          streamRef.current = null;
          mediaRecorderRef.current = null;
        });
        
        mediaRecorder.start(1000); // Capture data every second
        setIsAiModeActive(true);
        console.log('AI mode started - screen capture active');
        
      } catch (error) {
        console.error('Failed to start screen capture:', error);
        alert('Failed to start screen capture. Please ensure you grant permission to share your screen.');
      }
    } else {
      // Stop AI mode
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      mediaRecorderRef.current = null;
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

      {/* PDF Viewer */}
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
  );
} 