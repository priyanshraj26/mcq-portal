import { v4 as uuidv4 } from 'uuid';
import { PdfParseResult } from './pdfParser';

export interface ParsedQuestion {
  id: string;
  questionNumber: number;
  questionText: string;
  options: string[];
  correctAnswerIndex: number;
  rawText: string;
  confidence: number;
  flags: string[];
  pageNumber: number;
  parsedBy: 'algorithm' | 'pdfjs' | 'ai-compact' | 'ai-full';
}

export interface ParsedSection {
  sectionName: string;
  questions: ParsedQuestion[];
  parseWarnings: string[];
}

// --- Regex Patterns ---

const QUESTION_PATTERNS = [
  /^(\d+)\s*[.)]\s+(.+)/,                    // "1. " or "1) "
  /^Q\.?\s*(\d+)\s*[.):]?\s*(.+)/i,         // "Q1." or "Q. 1:"
  /^Question\s+(\d+)\s*[.):]?\s*(.+)/i,     // "Question 1:"
  /^\[(\d+)\]\s*(.+)/,                       // "[1] "
];

const OPTION_START_PATTERNS = [
  /^([A-Da-d])\s*[.)]\s*(.+)/,              // "A. " or "a) "
  /^\(([A-Da-d])\)\s*(.+)/,                 // "(A) " or "(a) "
  /^Option\s+([A-Da-d])\s*[.):]?\s*(.+)/i,  // "Option A:"
];

// Inline options: (a) text  (b) text  (c) text  (d) text
const INLINE_OPTIONS_PATTERN = /\(([A-Da-d])\)\s*([^(]+)/g;

// Answer patterns
const ANSWER_PATTERNS = [
  /^(?:Answer|Ans|Correct\s*Answer|Key)\s*[.:\s-]+\s*\(?([A-Da-d1-4])\)?/i,
  /^(?:Correct)\s*[.:\s-]+\s*(?:Option|Answer)?\s*[.:\s-]*\(?([A-Da-d1-4])\)?/i,
];

// Answer key section detection
const ANSWER_KEY_SECTION_PATTERN = /^(?:answer\s*key|answers?|key)\s*:?\s*$/i;
const ANSWER_KEY_ENTRY_PATTERN = /(\d+)\s*[.\-)\s]+\s*\(?([A-Da-d])\)?/g;

// Tabular format detection
const TABLE_SEPARATOR_PATTERN = /^[\s|+-]+$/;
const TABLE_ROW_PATTERN = /\|.*\|/;

function normalizeAnswerToIndex(answer: string): number {
  const upper = answer.toUpperCase();
  if (upper >= 'A' && upper <= 'D') {
    return upper.charCodeAt(0) - 'A'.charCodeAt(0);
  }
  const num = parseInt(answer);
  if (num >= 1 && num <= 4) return num - 1;
  return -1;
}

function detectQuestionStart(line: string): { questionNumber: number; text: string } | null {
  for (const pattern of QUESTION_PATTERNS) {
    const match = line.match(pattern);
    if (match) {
      return { questionNumber: parseInt(match[1]), text: match[2].trim() };
    }
  }
  return null;
}

function detectOption(line: string): { letter: string; text: string } | null {
  for (const pattern of OPTION_START_PATTERNS) {
    const match = line.match(pattern);
    if (match) {
      return { letter: match[1].toUpperCase(), text: match[2].trim() };
    }
  }
  return null;
}

function detectAnswer(line: string): number | null {
  for (const pattern of ANSWER_PATTERNS) {
    const match = line.match(pattern);
    if (match) {
      return normalizeAnswerToIndex(match[1]);
    }
  }
  return null;
}

function extractInlineOptions(text: string): { letter: string; text: string }[] | null {
  const options: { letter: string; text: string }[] = [];
  let match;
  const regex = new RegExp(INLINE_OPTIONS_PATTERN.source, 'g');
  while ((match = regex.exec(text)) !== null) {
    options.push({ letter: match[1].toUpperCase(), text: match[2].trim() });
  }
  return options.length >= 2 ? options : null;
}

function detectSameLineOptions(text: string): { letter: string; text: string }[] | null {
  // Pattern: A) text  B) text  C) text  D) text
  const regex = /([A-Da-d])\s*[.)]\s*([^A-Da-d).(]+?)(?=\s+[A-Da-d]\s*[.).]|$)/g;
  const options: { letter: string; text: string }[] = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    options.push({ letter: match[1].toUpperCase(), text: match[2].trim() });
  }
  return options.length >= 2 ? options : null;
}

// --- Tabular Format Parser ---

function parseTabularFormat(lines: string[], pageNumber: number): ParsedQuestion[] {
  const questions: ParsedQuestion[] = [];

  for (const line of lines) {
    if (!TABLE_ROW_PATTERN.test(line)) continue;
    if (TABLE_SEPARATOR_PATTERN.test(line.replace(/\|/g, ''))) continue;

    const cells = line.split('|').map((c) => c.trim()).filter(Boolean);
    if (cells.length < 6) continue;

    // Try to parse: Q.No | Question | A | B | C | D | Ans
    const qNum = parseInt(cells[0]);
    if (isNaN(qNum)) continue; // Skip header rows

    const questionText = cells[1];
    const optionTexts = cells.slice(2, cells.length - 1);
    const answerStr = cells[cells.length - 1];

    if (optionTexts.length < 2 || !questionText) continue;

    const correctIndex = normalizeAnswerToIndex(answerStr);

    questions.push({
      id: uuidv4(),
      questionNumber: qNum,
      questionText,
      options: optionTexts,
      correctAnswerIndex: correctIndex >= 0 ? correctIndex : -1,
      rawText: line,
      confidence: correctIndex >= 0 ? 0.85 : 0.5,
      flags: correctIndex < 0 ? ['answer_parse_failed'] : [],
      pageNumber,
      parsedBy: 'algorithm',
    });
  }

  return questions;
}

// --- Answer Key Parser ---

function parseAnswerKey(lines: string[]): Map<number, number> {
  const answerMap = new Map<number, number>();
  let inAnswerSection = false;

  for (const line of lines) {
    if (ANSWER_KEY_SECTION_PATTERN.test(line.trim())) {
      inAnswerSection = true;
      continue;
    }

    if (inAnswerSection || /answer\s*key/i.test(line)) {
      const regex = new RegExp(ANSWER_KEY_ENTRY_PATTERN.source, 'g');
      let match;
      while ((match = regex.exec(line)) !== null) {
        const qNum = parseInt(match[1]);
        const ansIndex = normalizeAnswerToIndex(match[2]);
        if (ansIndex >= 0) {
          answerMap.set(qNum, ansIndex);
        }
      }
    }
  }

  return answerMap;
}

// --- Main Block-based Extraction ---

interface RawBlock {
  questionNumber: number;
  questionLines: string[];
  optionLetters: string[];
  optionTexts: string[];
  answerIndex: number;
  pageNumber: number;
  rawLines: string[];
}

function extractBlocks(allLines: { text: string; page: number }[]): RawBlock[] {
  const blocks: RawBlock[] = [];
  let current: RawBlock | null = null;
  let collectingMultiLineOption = false;

  for (const { text: line, page } of allLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Check for answer line
    const answerIdx = detectAnswer(trimmed);
    if (answerIdx !== null && current) {
      current.answerIndex = answerIdx;
      current.rawLines.push(trimmed);
      continue;
    }

    // Check for question start
    const qStart = detectQuestionStart(trimmed);
    if (qStart) {
      // Save previous block
      if (current) blocks.push(current);

      // Check if the question line itself contains inline options
      const inlineOpts = extractInlineOptions(qStart.text);
      if (inlineOpts) {
        // Separate question text from inline options
        const qTextEnd = qStart.text.indexOf('(');
        const qText = qTextEnd > 0 ? qStart.text.substring(0, qTextEnd).trim() : qStart.text;
        current = {
          questionNumber: qStart.questionNumber,
          questionLines: [qText],
          optionLetters: inlineOpts.map((o) => o.letter),
          optionTexts: inlineOpts.map((o) => o.text),
          answerIndex: -1,
          pageNumber: page,
          rawLines: [trimmed],
        };
      } else {
        current = {
          questionNumber: qStart.questionNumber,
          questionLines: [qStart.text],
          optionLetters: [],
          optionTexts: [],
          answerIndex: -1,
          pageNumber: page,
          rawLines: [trimmed],
        };
      }
      collectingMultiLineOption = false;
      continue;
    }

    if (!current) continue;
    current.rawLines.push(trimmed);

    // Check for option line
    const opt = detectOption(trimmed);
    if (opt) {
      current.optionLetters.push(opt.letter);
      current.optionTexts.push(opt.text);
      collectingMultiLineOption = true;
      continue;
    }

    // Check for inline options on a standalone line
    const inlineOpts = extractInlineOptions(trimmed);
    if (inlineOpts && current.optionTexts.length === 0) {
      current.optionLetters = inlineOpts.map((o) => o.letter);
      current.optionTexts = inlineOpts.map((o) => o.text);
      collectingMultiLineOption = false;
      continue;
    }

    // Check for same-line options like: A) text B) text C) text D) text
    if (current.optionTexts.length === 0) {
      const sameLineOpts = detectSameLineOptions(trimmed);
      if (sameLineOpts && sameLineOpts.length >= 2) {
        current.optionLetters = sameLineOpts.map((o) => o.letter);
        current.optionTexts = sameLineOpts.map((o) => o.text);
        collectingMultiLineOption = false;
        continue;
      }
    }

    // Multi-line option continuation (indented text after an option)
    if (collectingMultiLineOption && current.optionTexts.length > 0 && /^\s{2,}/.test(line)) {
      const lastIdx = current.optionTexts.length - 1;
      current.optionTexts[lastIdx] += ' ' + trimmed;
      continue;
    }

    // If no options yet, this is continuation of the question text
    if (current.optionTexts.length === 0) {
      current.questionLines.push(trimmed);
    }
  }

  // Push last block
  if (current) blocks.push(current);

  return blocks;
}

function blocksToQuestions(blocks: RawBlock[], answerKey: Map<number, number>): ParsedQuestion[] {
  return blocks.map((block) => {
    const flags: string[] = [];
    let confidence = 1.0;

    // Use answer key if inline answer not found
    let correctIndex = block.answerIndex;
    if (correctIndex < 0 && answerKey.has(block.questionNumber)) {
      correctIndex = answerKey.get(block.questionNumber)!;
    }

    const questionText = block.questionLines.join('\n').trim();

    // Validate
    if (!questionText) {
      flags.push('empty_question_text');
      confidence -= 0.4;
    }

    if (block.optionTexts.length < 2) {
      flags.push('too_few_options');
      confidence -= 0.3;
    }

    if (block.optionTexts.length > 4) {
      flags.push('too_many_options');
      confidence -= 0.1;
      block.optionTexts = block.optionTexts.slice(0, 4);
    }

    if (correctIndex < 0) {
      flags.push('no_answer_found');
      confidence -= 0.3;
    } else if (correctIndex >= block.optionTexts.length) {
      flags.push('answer_out_of_range');
      confidence -= 0.3;
      correctIndex = -1;
    }

    // Ensure at least 2 options
    while (block.optionTexts.length < 2) {
      block.optionTexts.push('');
      flags.push('padded_empty_option');
    }

    confidence = Math.max(0, Math.min(1, confidence));

    return {
      id: uuidv4(),
      questionNumber: block.questionNumber,
      questionText,
      options: block.optionTexts,
      correctAnswerIndex: Math.max(correctIndex, 0),
      rawText: block.rawLines.join('\n'),
      confidence,
      flags,
      pageNumber: block.pageNumber,
      parsedBy: 'algorithm',
    };
  });
}

// --- Reusable text-to-questions extractor (used by pdfjsParser) ---

export function extractQuestionsFromText(text: string): ParsedQuestion[] {
  const lines = text.split('\n').filter(l => l.trim());
  const allLines = lines.map((line, i) => ({ text: line, page: 1 }));

  if (allLines.length === 0) return [];

  // Check tabular
  const hasTable = allLines.some(({ text }) => TABLE_ROW_PATTERN.test(text));
  if (hasTable) {
    const tableQuestions = parseTabularFormat(lines, 1);
    if (tableQuestions.length > 0) return tableQuestions;
  }

  const answerKey = parseAnswerKey(lines);
  const blocks = extractBlocks(allLines);
  if (blocks.length === 0) return [];

  return blocksToQuestions(blocks, answerKey);
}

// --- Main Export ---

export function extractQuestions(pdfResult: PdfParseResult): ParsedSection {
  const warnings: string[] = [];

  // Collect all lines with page numbers
  const allLines: { text: string; page: number }[] = [];
  for (const page of pdfResult.pages) {
    for (const line of page.lines) {
      allLines.push({ text: line, page: page.pageNumber });
    }
  }

  if (allLines.length === 0) {
    warnings.push('No text extracted from PDF');
    return {
      sectionName: pdfResult.filename.replace(/\.pdf$/i, ''),
      questions: [],
      parseWarnings: warnings,
    };
  }

  // Step 1: Check for tabular format
  const hasTable = allLines.some(({ text }) => TABLE_ROW_PATTERN.test(text));
  if (hasTable) {
    const tableLines = allLines.map((l) => l.text);
    const tableQuestions = parseTabularFormat(tableLines, allLines[0].page);
    if (tableQuestions.length > 0) {
      return {
        sectionName: pdfResult.filename.replace(/\.pdf$/i, ''),
        questions: tableQuestions,
        parseWarnings: warnings,
      };
    }
  }

  // Step 2: Parse answer key (if at end of document)
  const answerKey = parseAnswerKey(allLines.map((l) => l.text));
  if (answerKey.size > 0) {
    warnings.push(`Found answer key with ${answerKey.size} entries`);
  }

  // Step 3: Extract question blocks
  const blocks = extractBlocks(allLines);

  if (blocks.length === 0) {
    warnings.push('No questions detected in PDF');
    return {
      sectionName: pdfResult.filename.replace(/\.pdf$/i, ''),
      questions: [],
      parseWarnings: warnings,
    };
  }

  // Step 4: Convert blocks to questions with answer key
  const questions = blocksToQuestions(blocks, answerKey);

  // Step 5: Validate and flag
  const lowConfidence = questions.filter((q) => q.confidence < 0.75);
  if (lowConfidence.length > 0) {
    warnings.push(`${lowConfidence.length} questions have low confidence and need review`);
  }

  return {
    sectionName: pdfResult.filename.replace(/\.pdf$/i, ''),
    questions,
    parseWarnings: warnings,
  };
}
