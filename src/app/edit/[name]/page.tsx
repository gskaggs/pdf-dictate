'use client';

import { useState, useEffect, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Save, ZoomIn, ZoomOut, RotateCw, Download } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfEditorProps {}

export default function PdfEditor({}: PdfEditorProps) {
  const params = useParams();
  const pdfName = params.name as string;
  
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0);
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

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setIsLoading(false);
    setError('');
  }, []);

  const onDocumentLoadError = useCallback((error: Error) => {
    setError('Failed to load PDF');
    setIsLoading(false);
    console.error('PDF load error:', error);
  }, []);

  const handlePreviousPage = () => {
    setPageNumber(prev => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setPageNumber(prev => Math.min(numPages, prev + 1));
  };

  const handleZoomIn = () => {
    setScale(prev => Math.min(2.0, prev + 0.2));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(0.5, prev - 0.2));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // For now, we'll just show a message since actual PDF editing
      // requires more complex implementation with pdf-lib
      alert('PDF editing functionality will be implemented with pdf-lib for form fields and annotations');
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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Controls Panel */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Page Navigation */}
            <div>
              <label className="text-sm font-medium">Page Navigation</label>
              <div className="flex items-center space-x-2 mt-2">
                <Button
                  onClick={handlePreviousPage}
                  disabled={pageNumber <= 1}
                  variant="outline"
                  size="sm"
                >
                  Previous
                </Button>
                <div className="flex items-center space-x-1">
                  <Input
                    type="number"
                    value={pageNumber}
                    onChange={(e) => setPageNumber(Math.max(1, Math.min(numPages, parseInt(e.target.value) || 1)))}
                    className="w-16 text-center"
                    min={1}
                    max={numPages}
                  />
                  <span className="text-sm text-muted-foreground">/ {numPages}</span>
                </div>
                <Button
                  onClick={handleNextPage}
                  disabled={pageNumber >= numPages}
                  variant="outline"
                  size="sm"
                >
                  Next
                </Button>
              </div>
            </div>

            {/* Zoom Controls */}
            <div>
              <label className="text-sm font-medium">Zoom</label>
              <div className="flex items-center space-x-2 mt-2">
                <Button onClick={handleZoomOut} variant="outline" size="sm">
                  <ZoomOut className="h-3 w-3" />
                </Button>
                <Badge variant="secondary">{Math.round(scale * 100)}%</Badge>
                <Button onClick={handleZoomIn} variant="outline" size="sm">
                  <ZoomIn className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Rotation */}
            <div>
              <label className="text-sm font-medium">Rotation</label>
              <div className="flex items-center space-x-2 mt-2">
                <Button onClick={handleRotate} variant="outline" size="sm">
                  <RotateCw className="mr-2 h-3 w-3" />
                  Rotate 90°
                </Button>
                <Badge variant="secondary">{rotation}°</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* PDF Viewer */}
        <Card className="lg:col-span-3">
          <CardContent className="p-6">
            {isLoading && (
              <div className="flex items-center justify-center h-96">
                <div className="text-muted-foreground">Loading PDF...</div>
              </div>
            )}
            
            {error && (
              <div className="flex items-center justify-center h-96">
                <div className="text-destructive">{error}</div>
              </div>
            )}

            {pdfUrl && !isLoading && !error && (
              <div className="flex justify-center">
                <Document
                  file={pdfUrl}
                  onLoadSuccess={onDocumentLoadSuccess}
                  onLoadError={onDocumentLoadError}
                  loading={<div>Loading PDF...</div>}
                  error={<div>Failed to load PDF</div>}
                >
                  <Page
                    pageNumber={pageNumber}
                    scale={scale}
                    rotate={rotation}
                    loading={<div>Loading page...</div>}
                    error={<div>Failed to load page</div>}
                  />
                </Document>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 