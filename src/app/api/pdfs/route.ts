import { NextResponse } from 'next/server';
import { readdir, stat } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

export async function GET() {
  try {
    const pdfDir = path.join(process.cwd(), 'public', 'pdfs');
    
    // Check if directory exists
    if (!existsSync(pdfDir)) {
      return NextResponse.json({ pdfs: [] });
    }
    
    const files = await readdir(pdfDir);
    
    // Filter for PDF files only and get their stats
    const pdfFiles = await Promise.all(
      files
        .filter(file => file.toLowerCase().endsWith('.pdf'))
        .map(async (file) => {
          const filePath = path.join(pdfDir, file);
          const stats = await stat(filePath);
          
          return {
            name: file,
            displayName: file.replace(/\.pdf$/i, '').replace(/-/g, ' '),
            size: stats.size,
            lastModified: stats.mtime.toISOString(),
          };
        })
    );
    
    // Sort by last modified date (newest first)
    pdfFiles.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());
    
    return NextResponse.json({ pdfs: pdfFiles });
    
  } catch (error) {
    console.error('Error listing PDFs:', error);
    return NextResponse.json({ error: 'Failed to list PDFs' }, { status: 500 });
  }
} 