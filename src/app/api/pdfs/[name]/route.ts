import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    
    // Ensure the filename ends with .pdf
    const filename = name.endsWith('.pdf') ? name : `${name}.pdf`;
    const filePath = path.join(process.cwd(), 'public', 'pdfs', filename);
    
    // Check if file exists
    if (!existsSync(filePath)) {
      return NextResponse.json({ error: 'PDF not found' }, { status: 404 });
    }
    
    // Read the file
    const fileBuffer = await readFile(filePath);
    
    // Return the PDF with appropriate headers
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
      },
    });
    
  } catch (error) {
    console.error('Error serving PDF:', error);
    return NextResponse.json({ error: 'Failed to serve PDF' }, { status: 500 });
  }
} 