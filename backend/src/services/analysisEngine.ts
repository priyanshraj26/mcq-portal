import prisma from '../lib/prisma';

export interface QuestionAnalysis {
  questionId: string;
  questionNumber: number;
  questionText: string;
  options: string[];
  correctAnswerIndex: number;
  selectedIndex: number | null;
  isCorrect: boolean;
  isSkipped: boolean;
  markedForReview: boolean;
  timeTakenSecs: number;
  sectionName: string;
}

export interface SectionAnalysis {
  sectionId: string;
  sectionName: string;
  totalQuestions: number;
  correct: number;
  wrong: number;
  skipped: number;
  accuracy: number;
  timeTakenSecs: number;
  avgTimePerQuestion: number;
}

export interface TimeAnalysis {
  avgTimePerQuestion: number;
  avgTimePerSection: Record<string, number>;
  fastestQuestions: { questionNumber: number; timeSecs: number }[];
  slowestQuestions: { questionNumber: number; timeSecs: number }[];
  timeDistribution: { range: string; count: number }[];
}

export interface ExamAnalysis {
  sessionId: string;
  examTitle: string;
  totalQuestions: number;
  totalCorrect: number;
  totalWrong: number;
  totalSkipped: number;
  totalScore: number;
  maxScore: number;
  percentage: number;
  positiveMarks: number;
  negativeMarks: number;
  netScore: number;
  passed: boolean | null;
  passingPercentage: number | null;
  timeTakenSecs: number;
  sections: SectionAnalysis[];
  questions: QuestionAnalysis[];
  timeAnalysis: TimeAnalysis;
  marksPerCorrect: number;
  negativeMarkValue: number;
  negativeMarkingEnabled: boolean;
}

export async function generateAnalysis(sessionId: string): Promise<ExamAnalysis> {
  const session = await prisma.examSession.findUnique({
    where: { id: sessionId },
    include: {
      exam: {
        include: {
          sections: {
            orderBy: { order: 'asc' },
            include: { questions: { orderBy: { order: 'asc' } } },
          },
          settings: true,
        },
      },
      answers: true,
    },
  });

  if (!session) throw new Error('Session not found');

  const settings = session.exam.settings;
  const marksPerCorrect = settings?.marksPerCorrect ?? 1.0;
  const negativeMarkingEnabled = settings?.negativeMarking ?? false;
  const negativeMarkValue = settings?.negativeMarkValue ?? 0.25;
  const passingPercentage = settings?.passingPercentage ?? null;

  // Build answer map
  const answerMap = new Map(session.answers.map((a) => [a.questionId, a]));

  // Analyze each question
  const questionAnalyses: QuestionAnalysis[] = [];
  let qNum = 0;

  for (const section of session.exam.sections) {
    for (const question of section.questions) {
      qNum++;
      const answer = answerMap.get(question.id);
      const selectedIndex = answer?.selectedIndex ?? null;
      const isSkipped = selectedIndex === null;
      const isCorrect = !isSkipped && selectedIndex === question.correctAnswerIndex;

      questionAnalyses.push({
        questionId: question.id,
        questionNumber: qNum,
        questionText: question.questionText,
        options: question.options as string[],
        correctAnswerIndex: question.correctAnswerIndex,
        selectedIndex,
        isCorrect,
        isSkipped,
        markedForReview: answer?.markedForReview ?? false,
        timeTakenSecs: answer?.timeTakenSecs ?? 0,
        sectionName: section.name,
      });
    }
  }

  const totalQuestions = questionAnalyses.length;
  const totalCorrect = questionAnalyses.filter((q) => q.isCorrect).length;
  const totalSkipped = questionAnalyses.filter((q) => q.isSkipped).length;
  const totalWrong = totalQuestions - totalCorrect - totalSkipped;

  const positiveMarks = totalCorrect * marksPerCorrect;
  const negativeMarks = negativeMarkingEnabled ? totalWrong * negativeMarkValue : 0;
  const netScore = positiveMarks - negativeMarks;
  const maxScore = totalQuestions * marksPerCorrect;
  const percentage = maxScore > 0 ? (netScore / maxScore) * 100 : 0;
  const passed = passingPercentage !== null ? percentage >= passingPercentage : null;

  // Section analysis
  const sectionAnalyses: SectionAnalysis[] = session.exam.sections.map((section) => {
    const sectionQs = questionAnalyses.filter((q) => q.sectionName === section.name);
    const correct = sectionQs.filter((q) => q.isCorrect).length;
    const skipped = sectionQs.filter((q) => q.isSkipped).length;
    const wrong = sectionQs.length - correct - skipped;
    const timeTaken = sectionQs.reduce((sum, q) => sum + q.timeTakenSecs, 0);

    return {
      sectionId: section.id,
      sectionName: section.name,
      totalQuestions: sectionQs.length,
      correct,
      wrong,
      skipped,
      accuracy: sectionQs.length > 0 ? (correct / (correct + wrong || 1)) * 100 : 0,
      timeTakenSecs: timeTaken,
      avgTimePerQuestion: sectionQs.length > 0 ? timeTaken / sectionQs.length : 0,
    };
  });

  // Time analysis
  const answeredQs = questionAnalyses.filter((q) => q.timeTakenSecs > 0);
  const totalTimeSpent = answeredQs.reduce((sum, q) => sum + q.timeTakenSecs, 0);

  const sortedByTime = [...answeredQs].sort((a, b) => a.timeTakenSecs - b.timeTakenSecs);

  const timeDistribution = [
    { range: '<10s', count: answeredQs.filter((q) => q.timeTakenSecs < 10).length },
    { range: '10-30s', count: answeredQs.filter((q) => q.timeTakenSecs >= 10 && q.timeTakenSecs < 30).length },
    { range: '30-60s', count: answeredQs.filter((q) => q.timeTakenSecs >= 30 && q.timeTakenSecs < 60).length },
    { range: '>60s', count: answeredQs.filter((q) => q.timeTakenSecs >= 60).length },
  ];

  const avgTimePerSection: Record<string, number> = {};
  for (const sa of sectionAnalyses) {
    avgTimePerSection[sa.sectionName] = sa.avgTimePerQuestion;
  }

  const timeAnalysis: TimeAnalysis = {
    avgTimePerQuestion: answeredQs.length > 0 ? totalTimeSpent / answeredQs.length : 0,
    avgTimePerSection,
    fastestQuestions: sortedByTime.slice(0, 5).map((q) => ({
      questionNumber: q.questionNumber,
      timeSecs: q.timeTakenSecs,
    })),
    slowestQuestions: sortedByTime.slice(-5).reverse().map((q) => ({
      questionNumber: q.questionNumber,
      timeSecs: q.timeTakenSecs,
    })),
    timeDistribution,
  };

  return {
    sessionId,
    examTitle: session.exam.title,
    totalQuestions,
    totalCorrect,
    totalWrong,
    totalSkipped,
    totalScore: netScore,
    maxScore,
    percentage: Math.round(percentage * 100) / 100,
    positiveMarks,
    negativeMarks,
    netScore: Math.round(netScore * 100) / 100,
    passed,
    passingPercentage,
    timeTakenSecs: session.timeTakenSecs || 0,
    sections: sectionAnalyses,
    questions: questionAnalyses,
    timeAnalysis,
    marksPerCorrect,
    negativeMarkValue,
    negativeMarkingEnabled,
  };
}
