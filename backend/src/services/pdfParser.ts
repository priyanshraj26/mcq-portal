import { PDFParse } from 'pdf-parse';
import fs from 'fs';

export interface PdfPage {
  pageNumber: number;
  text: string;
  lines: string[];
}

export interface PdfParseResult {
  pages: PdfPage[];
  fullText: string;
  totalPages: number;
  filename: string;
}

export async function parsePdf(filePath: string, filename: string): Promise<PdfParseResult> {
  const data = new Uint8Array(fs.readFileSync(filePath));

  const parser = new PDFParse({ data });
  const textResult = await parser.getText();

  const pages: PdfPage[] = textResult.pages.map((page) => ({
    pageNumber: page.num,
    text: page.text,
    lines: page.text.split('\n').filter((l) => l.trim()),
  }));

  await parser.destroy();

  return {
    pages,
    fullText: textResult.text,
    totalPages: textResult.total,
    filename,
  };
}
