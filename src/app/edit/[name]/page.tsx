'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Save, Download } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface PdfEditorProps {}

export default function PdfEditor({}: PdfEditorProps) {
  const params = useParams();
  const pdfName = params.name as string;
  const containerRef = useRef(null);
  
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>('');

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
        .then(() => {
          setIsLoading(false);
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
      }
    };
  }, [pdfUrl]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // For now, we'll just show a message since actual PDF editing
      // requires more complex implementation with NutrientViewer API
      alert('PDF editing functionality will be implemented with NutrientViewer API');
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save PDF');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = `${pdfName}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
            onClick={handleDownload}
            variant="outline"
            size="sm"
          >
            <Download className="mr-2 h-3 w-3" />
            Download
          </Button>
          <Button 
            onClick={handleSave}
            disabled={isSaving}
            size="sm"
          >
            <Save className="mr-2 h-3 w-3" />
            {isSaving ? 'Saving...' : 'Save'}
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