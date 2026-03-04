import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ── Auth ──
export const registerUser = (data) => api.post('/auth/register', data);
export const loginUser = (data) => api.post('/auth/login', data);
export const getMe = () => api.get('/auth/me');
export const updateProfile = (data) => api.put('/auth/profile', data);
export const deleteAccount = () => api.delete('/auth/delete');
export const getLearningProfile = () => api.get('/learning-profile');
export const updateLearningProfile = (data) => api.put('/learning-profile', data);
export const getLearningContext = () => api.get('/learning-context');
export const updateLearningContext = (promptText) =>
  api.put('/learning-context', { prompt_text: promptText });

// ── Sessions ──
export const createSession = (youtubeUrl) => api.post('/sessions', { youtube_url: youtubeUrl });
export const listSessions = () => api.get('/sessions');
export const getSession = (id) => api.get(`/sessions/${id}`);
export const deleteSession = (id) => api.delete(`/sessions/${id}`);

// ── Checkpoints ──
export const answerCheckpoint = (sessionId, checkpointId, answer) =>
  api.post(`/sessions/${sessionId}/answer`, { checkpoint_id: checkpointId, answer });

// ── Chat ──
export const sendChatMessage = (sessionId, message, currentTime) =>
  api.post(`/sessions/${sessionId}/chat`, { message, current_time: currentTime });

// ── Study Materials ──
export const generateStudyMaterial = (sessionId, materialTypes) =>
  api.post(`/sessions/${sessionId}/study-materials`, { material_types: materialTypes });
export const listStudyMaterials = (sessionId) => api.get(`/sessions/${sessionId}/study-materials`);
export const getStudyMaterial = (sessionId, materialId) =>
  api.get(`/sessions/${sessionId}/study-materials/${materialId}`);
export const getSessionRecap = (sessionId) => api.get(`/sessions/${sessionId}/recap`);
export const generateSessionRecap = (sessionId) => api.post(`/sessions/${sessionId}/recap`);

export default api;
