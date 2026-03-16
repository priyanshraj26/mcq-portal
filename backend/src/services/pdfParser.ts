import { PDFParse } from 'pdf-parse';
import fs from 'fs';
import { extractQuestions, ParsedSection, ParsedQuestion } from './questionExtractor';
import { parseWithPdfjs, getPdfPageCount as pdfjsPageCount } from './pdfjsParser';

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

// --- 3-Layer Pipeline ---

export async function parsePdfWithPipeline(
  pdfBuffer: Buffer,
  filename: string,
  pageRange?: { from: number; to: number }
): Promise<ParsedSection> {
  // Write buffer to temp for Layer 1 (pdf-parse requires file path)
  const os = await import('os');
  const path = await import('path');
  const { v4: uuidv4 } = await import('uuid');
  const tmpPath = path.join(os.tmpdir(), `mcq-${uuidv4()}.pdf`);
  fs.writeFileSync(tmpPath, pdfBuffer);

  let layer1Section: ParsedSection;
  try {
    const pdfResult = await parsePdf(tmpPath, filename);

    // If pageRange, filter pages
    if (pageRange) {
      pdfResult.pages = pdfResult.pages.filter(
        p => p.pageNumber >= pageRange.from && p.pageNumber <= pageRange.to
      );
    }

    layer1Section = extractQuestions(pdfResult);
  } finally {
    try { fs.unlinkSync(tmpPath); } catch {}
  }

  // LAYER 2: Auto-trigger pdfjs for any sub-100% confidence questions
  const lowConfidenceIndexes = layer1Section.questions
    .map((q, i) => ({ q, i }))
    .filter(({ q }) => q.confidence < 1.0);

  if (lowConfidenceIndexes.length > 0) {
    try {
      const layer2Questions = await parseWithPdfjs(pdfBuffer, pageRange);

      // Merge: replace low-confidence questions with pdfjs versions where available
      for (const { i, q } of lowConfidenceIndexes) {
        const match = layer2Questions.find(l2q =>
          l2q.questionNumber === q.questionNumber ||
          stringSimilarity(l2q.questionText, q.questionText) > 0.7
        );
        if (match && match.confidence >= q.confidence) {
          layer1Section.questions[i] = { ...match, parsedBy: 'pdfjs' };
        }
      }
    } catch (err) {
      console.error('Layer 2 (pdfjs) parsing failed, using Layer 1 results:', err);
    }
  }

  return layer1Section;
}

export async function getPdfPageCount(pdfBuffer: Buffer): Promise<number> {
  return pdfjsPageCount(pdfBuffer);
}

// Simple string similarity for matching (Jaccard on words)
function stringSimilarity(a: string, b: string): number {
  const setA = new Set(a.toLowerCase().split(/\s+/));
  const setB = new Set(b.toLowerCase().split(/\s+/));
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}
