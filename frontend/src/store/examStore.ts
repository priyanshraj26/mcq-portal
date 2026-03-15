import { create } from 'zustand';

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
}

export interface ParsedSection {
  sectionName: string;
  questions: ParsedQuestion[];
  parseWarnings: string[];
}

export interface Question {
  id: string;
  order: number;
  questionText: string;
  options: string[];
  correctAnswerIndex: number;
  confidence: number;
}

export interface Section {
  id: string;
  name: string;
  order: number;
  timeLimitSecs: number | null;
  questions: Question[];
}

export interface ExamSettings {
  totalTimeLimitSecs: number | null;
  perQuestionTimeSecs: number | null;
  allowNavigation: boolean;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  negativeMarking: boolean;
  negativeMarkValue: number;
  marksPerCorrect: number;
  passingPercentage: number | null;
  showResultImmediately: boolean;
}

export interface AnswerState {
  questionId: string;
  selectedIndex: number | null;
  markedForReview: boolean;
  isCompleted: boolean;
  timeTakenSecs: number;
  visitCount: number;
}

interface ExamStore {
  // Upload state
  uploadId: string | null;
  parsedSections: ParsedSection[];
  setUploadResult: (uploadId: string, sections: ParsedSection[]) => void;
  updateParsedQuestion: (sectionIdx: number, questionIdx: number, question: ParsedQuestion) => void;
  deleteParsedQuestion: (sectionIdx: number, questionIdx: number) => void;

  // Exam state
  currentExamId: string | null;
  setCurrentExamId: (id: string | null) => void;

  // Session state
  sessionId: string | null;
  sections: Section[];
  settings: ExamSettings | null;
  answers: Map<string, AnswerState>;
  currentSectionIdx: number;
  currentQuestionIdx: number;
  startedAt: Date | null;
  examTitle: string;

  initSession: (data: {
    sessionId: string;
    exam: { title: string; sections: Section[]; settings: ExamSettings | null };
    startedAt: string;
    answers?: any[];
  }) => void;

  setAnswer: (questionId: string, selectedIndex: number | null) => void;
  toggleReview: (questionId: string) => void;
  markCompleted: (questionId: string) => void;
  navigateTo: (sectionIdx: number, questionIdx: number) => void;
  nextQuestion: () => void;
  prevQuestion: () => void;
  addTime: (questionId: string, secs: number) => void;

  getCurrentQuestion: () => Question | null;
  getCurrentSection: () => Section | null;
  getQuestionAnswer: (questionId: string) => AnswerState | undefined;
  getTotalQuestions: () => number;
  getAnsweredCount: () => number;
  getMarkedCount: () => number;

  reset: () => void;
}

const useExamStore = create<ExamStore>((set, get) => ({
  // Upload
  uploadId: null,
  parsedSections: [],
  setUploadResult: (uploadId, sections) => set({ uploadId, parsedSections: sections }),
  updateParsedQuestion: (sectionIdx, questionIdx, question) => {
    const sections = [...get().parsedSections];
    sections[sectionIdx] = {
      ...sections[sectionIdx],
      questions: sections[sectionIdx].questions.map((q, i) => (i === questionIdx ? question : q)),
    };
    set({ parsedSections: sections });
  },
  deleteParsedQuestion: (sectionIdx, questionIdx) => {
    const sections = [...get().parsedSections];
    sections[sectionIdx] = {
      ...sections[sectionIdx],
      questions: sections[sectionIdx].questions.filter((_, i) => i !== questionIdx),
    };
    set({ parsedSections: sections });
  },

  // Exam
  currentExamId: null,
  setCurrentExamId: (id) => set({ currentExamId: id }),

  // Session
  sessionId: null,
  sections: [],
  settings: null,
  answers: new Map(),
  currentSectionIdx: 0,
  currentQuestionIdx: 0,
  startedAt: null,
  examTitle: '',

  initSession: (data) => {
    const answers = new Map<string, AnswerState>();
    data.exam.sections.forEach((section) => {
      section.questions.forEach((q) => {
        const existing = data.answers?.find((a: any) => a.questionId === q.id);
        answers.set(q.id, {
          questionId: q.id,
          selectedIndex: existing?.selectedIndex ?? null,
          markedForReview: existing?.markedForReview ?? false,
          isCompleted: existing?.isCompleted ?? false,
          timeTakenSecs: existing?.timeTakenSecs ?? 0,
          visitCount: existing?.visitCount ?? 0,
        });
      });
    });

    set({
      sessionId: data.sessionId,
      sections: data.exam.sections,
      settings: data.exam.settings,
      answers,
      currentSectionIdx: 0,
      currentQuestionIdx: 0,
      startedAt: new Date(data.startedAt),
      examTitle: data.exam.title,
    });
  },

  setAnswer: (questionId, selectedIndex) => {
    const answers = new Map(get().answers);
    const current = answers.get(questionId);
    if (current) {
      answers.set(questionId, { ...current, selectedIndex });
    }
    set({ answers });
  },

  toggleReview: (questionId) => {
    const answers = new Map(get().answers);
    const current = answers.get(questionId);
    if (current) {
      answers.set(questionId, { ...current, markedForReview: !current.markedForReview });
    }
    set({ answers });
  },

  markCompleted: (questionId) => {
    const answers = new Map(get().answers);
    const current = answers.get(questionId);
    if (current) {
      answers.set(questionId, { ...current, isCompleted: true });
    }
    set({ answers });
  },

  navigateTo: (sectionIdx, questionIdx) => {
    set({ currentSectionIdx: sectionIdx, currentQuestionIdx: questionIdx });
  },

  nextQuestion: () => {
    const { currentSectionIdx, currentQuestionIdx, sections } = get();
    const section = sections[currentSectionIdx];
    if (!section) return;

    if (currentQuestionIdx < section.questions.length - 1) {
      set({ currentQuestionIdx: currentQuestionIdx + 1 });
    } else if (currentSectionIdx < sections.length - 1) {
      set({ currentSectionIdx: currentSectionIdx + 1, currentQuestionIdx: 0 });
    }
  },

  prevQuestion: () => {
    const { currentSectionIdx, currentQuestionIdx, sections } = get();

    if (currentQuestionIdx > 0) {
      set({ currentQuestionIdx: currentQuestionIdx - 1 });
    } else if (currentSectionIdx > 0) {
      const prevSection = sections[currentSectionIdx - 1];
      set({
        currentSectionIdx: currentSectionIdx - 1,
        currentQuestionIdx: prevSection.questions.length - 1,
      });
    }
  },

  addTime: (questionId, secs) => {
    const answers = new Map(get().answers);
    const current = answers.get(questionId);
    if (current) {
      answers.set(questionId, {
        ...current,
        timeTakenSecs: current.timeTakenSecs + secs,
        visitCount: current.visitCount + 1,
      });
    }
    set({ answers });
  },

  getCurrentQuestion: () => {
    const { currentSectionIdx, currentQuestionIdx, sections } = get();
    return sections[currentSectionIdx]?.questions[currentQuestionIdx] || null;
  },

  getCurrentSection: () => {
    const { currentSectionIdx, sections } = get();
    return sections[currentSectionIdx] || null;
  },

  getQuestionAnswer: (questionId) => get().answers.get(questionId),

  getTotalQuestions: () => get().sections.reduce((sum, s) => sum + s.questions.length, 0),

  getAnsweredCount: () => {
    let count = 0;
    get().answers.forEach((a) => {
      if (a.selectedIndex !== null) count++;
    });
    return count;
  },

  getMarkedCount: () => {
    let count = 0;
    get().answers.forEach((a) => {
      if (a.markedForReview) count++;
    });
    return count;
  },

  reset: () =>
    set({
      uploadId: null,
      parsedSections: [],
      currentExamId: null,
      sessionId: null,
      sections: [],
      settings: null,
      answers: new Map(),
      currentSectionIdx: 0,
      currentQuestionIdx: 0,
      startedAt: null,
      examTitle: '',
    }),
}));

export default useExamStore;
