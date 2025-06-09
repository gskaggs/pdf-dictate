import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    
    // Ensure the filename ends with .pdf
    const filename = name.endsWith('.pdf') ? name : `${name}.pdf`;
    const filePath = path.join(process.cwd(), 'public', 'pdfs', filename);
    
    // Check if original file exists
    if (!existsSync(filePath)) {
      return NextResponse.json({ error: 'Original PDF not found' }, { status: 404 });
    }
    
    // Get the PDF data from the request
    const data = await request.formData();
    const file = data.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No PDF data provided' }, { status: 400 });
    }
    
    // Check if file is a PDF
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are allowed' }, { status: 400 });
    }
    
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Overwrite the existing file
    await writeFile(filePath, buffer);
    
    return NextResponse.json({ 
      message: 'PDF saved successfully',
      filename: filename
    });
    
  } catch (error) {
    console.error('Save error:', error);
    return NextResponse.json({ error: 'Failed to save PDF' }, { status: 500 });
  }
} 