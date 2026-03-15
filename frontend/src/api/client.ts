import axios from 'axios';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
});
const api = apiClient;

// Upload APIs
export const uploadPdfs = async (files: File[]) => {
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));
  const { data } = await api.post('/upload/pdf', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

export const confirmUpload = async (body: { uploadId: string; title: string; sections: any[] }) => {
  const { data } = await api.post('/upload/confirm', body);
  return data;
};

// Exam APIs
export const getExams = async () => {
  const { data } = await api.get('/exams');
  return data;
};

export const getExam = async (id: string) => {
  const { data } = await api.get(`/exams/${id}`);
  return data;
};

export const saveExamSettings = async (id: string, settings: any) => {
  const { data } = await api.post(`/exams/${id}/settings`, settings);
  return data;
};

export const deleteExam = async (id: string) => {
  const { data } = await api.delete(`/exams/${id}`);
  return data;
};

// Session APIs
export const startSession = async (examId: string) => {
  const { data } = await api.post('/sessions/start', { examId });
  return data;
};

export const getSession = async (id: string) => {
  const { data } = await api.get(`/sessions/${id}`);
  return data;
};

export const saveAnswer = async (sessionId: string, answer: {
  questionId: string;
  selectedIndex: number | null;
  markedForReview?: boolean;
  isCompleted?: boolean;
  timeTakenSecs?: number;
}) => {
  const { data } = await api.patch(`/sessions/${sessionId}/answer`, answer);
  return data;
};

export const submitSession = async (id: string) => {
  const { data } = await api.post(`/sessions/${id}/submit`);
  return data;
};

export const getAnalysis = async (sessionId: string) => {
  const { data } = await api.get(`/sessions/${sessionId}/analysis`);
  return data;
};

export default api;
