import { ParsedQuestion, extractQuestionsFromText } from './questionExtractor';

interface TextItem {
  text: string;
  x: number;
  y: number;
  fontSize: number;
  pageNum: number;
}

export async function parseWithPdfjs(
  pdfBuffer: Buffer,
  pageRange?: { from: number; to: number }
): Promise<ParsedQuestion[]> {
  // Dynamic import for pdfjs-dist (ESM/CJS compatibility)
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');

  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(pdfBuffer) });
  const pdf = await loadingTask.promise;

  const startPage = pageRange?.from ?? 1;
  const endPage = Math.min(pageRange?.to ?? pdf.numPages, pdf.numPages);

  const allItems: TextItem[] = [];

  for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const viewport = page.getViewport({ scale: 1.0 });

    for (const item of textContent.items as any[]) {
      if (!item.str?.trim()) continue;
      const transform = item.transform;
      allItems.push({
        text: item.str,
        x: Math.round(transform[4]),
        y: Math.round(viewport.height - transform[5]),
        fontSize: Math.round(item.height || 12),
        pageNum,
      });
    }
  }

  // Group items into lines by y-coordinate proximity
  const lines = groupIntoLines(allItems);
  const fullText = lines.join('\n');

  // Re-use the existing regex extraction on positionally-sorted text
  const questions = extractQuestionsFromText(fullText);

  return questions.map((q, idx) => ({
    ...q,
    id: `pdfjs-${idx}`,
    parsedBy: 'pdfjs' as const,
  }));
}

function groupIntoLines(items: TextItem[]): string[] {
  if (items.length === 0) return [];

  // Sort by page, then y (top to bottom), then x (left to right)
  items.sort((a, b) =>
    a.pageNum !== b.pageNum ? a.pageNum - b.pageNum :
    a.y !== b.y ? a.y - b.y : a.x - b.x
  );

  const lines: string[] = [];
  let currentY = items[0].y;
  let currentPage = items[0].pageNum;
  let currentLine = '';

  for (const item of items) {
    if (item.pageNum !== currentPage || Math.abs(item.y - currentY) > 4) {
      if (currentLine.trim()) lines.push(currentLine.trim());
      currentLine = item.text;
      currentY = item.y;
      currentPage = item.pageNum;
    } else {
      currentLine += (currentLine && !currentLine.endsWith(' ') ? ' ' : '') + item.text;
    }
  }
  if (currentLine.trim()) lines.push(currentLine.trim());

  return lines;
}

export async function getPdfPageCount(pdfBuffer: Buffer): Promise<number> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(pdfBuffer) });
  const pdf = await loadingTask.promise;
  return pdf.numPages;
}
