import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

// Helper function to make filename URL-safe
function makeUrlSafe(filename: string): string {
  const name = path.parse(filename).name;
  const ext = path.parse(filename).ext;
  
  // Replace spaces and special characters with hyphens, convert to lowercase
  const safeName = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
  
  return `${safeName}${ext}`;
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.formData();
    const file = data.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }
    
    // Check if file is a PDF
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are allowed' }, { status: 400 });
    }
    
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Create URL-safe filename
    const safeFilename = makeUrlSafe(file.name);
    const uploadDir = path.join(process.cwd(), 'public', 'pdfs');
    
    // Ensure upload directory exists
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }
    
    const filePath = path.join(uploadDir, safeFilename);
    
    // Write file to disk
    await writeFile(filePath, buffer);
    
    return NextResponse.json({ 
      message: 'File uploaded successfully',
      filename: safeFilename,
      originalName: file.name
    });
    
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
} 