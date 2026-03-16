import { GoogleGenAI } from '@google/genai';
import { ParsedQuestion } from './questionExtractor';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
const MODEL = 'gemini-2.5-flash';

const MCQ_EXTRACTION_PROMPT = `You are an expert MCQ question extractor. Your task is to extract all multiple choice questions from the provided content and return them as a JSON array.

RULES:
- Extract every single MCQ question you can find, even if the formatting is inconsistent
- Each question must have exactly 2 to 4 options
- Identify the correct answer for each question
- correctAnswerIndex is 0-based (0 = first option, 1 = second option, etc.)
- Clean up any OCR artifacts, extra spaces, or encoding issues in the text
- If a question has sub-parts, treat each sub-part as a separate question
- Do NOT include non-MCQ content (headings, instructions, passages)
- If you cannot determine the correct answer, set correctAnswerIndex to -1

Return ONLY a valid JSON array with no markdown, no code blocks, no explanation. Just the raw JSON array.

Schema for each question:
{
  "questionNumber": number,
  "questionText": string,
  "options": string[],
  "correctAnswerIndex": number
}

Example output:
[{"questionNumber":1,"questionText":"What is the capital of France?","options":["Berlin","Paris","Rome","Madrid"],"correctAnswerIndex":1}]`;

export async function parseCompact(
  lowConfidenceQuestions: { rawText: string; questionNumber: number }[]
): Promise<ParsedQuestion[]> {
  if (lowConfidenceQuestions.length === 0) return [];

  const textToSend = lowConfidenceQuestions
    .map(q => `[Question ${q.questionNumber}]\n${q.rawText}`)
    .join('\n\n---\n\n');

  const prompt = `${MCQ_EXTRACTION_PROMPT}\n\nContent to extract from:\n\n${textToSend}`;

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ parts: [{ text: prompt }] }],
  });

  const rawText = response.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  return parseGeminiResponse(rawText, 'ai-compact');
}

export async function parseWholePdf(
  pdfBuffer: Buffer,
  pageRange?: { from: number; to: number }
): Promise<ParsedQuestion[]> {
  const base64Pdf = pdfBuffer.toString('base64');

  const rangeNote = pageRange
    ? `Only extract questions from pages ${pageRange.from} to ${pageRange.to}.`
    : 'Extract all questions from the entire document.';

  const prompt = `${MCQ_EXTRACTION_PROMPT}\n\n${rangeNote}`;

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{
      parts: [
        { text: prompt },
        {
          inlineData: {
            mimeType: 'application/pdf',
            data: base64Pdf,
          }
        }
      ]
    }],
  });

  const rawText = response.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  return parseGeminiResponse(rawText, 'ai-full');
}

function parseGeminiResponse(
  rawText: string,
  parsedBy: 'ai-compact' | 'ai-full'
): ParsedQuestion[] {
  try {
    const cleaned = rawText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const parsed = JSON.parse(cleaned);

    if (!Array.isArray(parsed)) {
      console.error('Gemini returned non-array response');
      return [];
    }

    return parsed
      .filter((q: any) =>
        q.questionText?.trim() &&
        Array.isArray(q.options) &&
        q.options.length >= 2 &&
        q.options.length <= 4
      )
      .map((q: any, idx: number) => ({
        id: `${parsedBy}-${idx}`,
        questionNumber: q.questionNumber ?? idx + 1,
        questionText: q.questionText.trim(),
        options: q.options.map((o: string) => o.trim()),
        correctAnswerIndex: typeof q.correctAnswerIndex === 'number'
          ? q.correctAnswerIndex
          : -1,
        confidence: q.correctAnswerIndex >= 0 ? 1.0 : 0.5,
        rawText: q.questionText,
        flags: q.correctAnswerIndex < 0 ? ['no_answer_found'] : [] as string[],
        pageNumber: 0,
        parsedBy,
      }));
  } catch (err) {
    console.error('Failed to parse Gemini JSON response:', err);
    console.error('Raw response was:', rawText);
    return [];
  }
}
