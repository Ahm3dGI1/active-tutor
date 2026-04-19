import { getToken, getApiUrl, clearToken } from './auth.js';

/**
 * Make an authenticated API request
 */
async function apiRequest(method, path, body = null) {
  const [token, baseUrl] = await Promise.all([getToken(), getApiUrl()]);

  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options = { method, headers };
  if (body) {
    options.body = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(`${baseUrl}${path}`, options);
  } catch (err) {
    const reason = err?.message || 'Network error';
    throw new Error(`Unable to reach API at ${baseUrl}. ${reason}`);
  }

  if (res.status === 401) {
    await clearToken();
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || err.message || `API error ${res.status}`);
  }

  return res.json();
}

function unwrapPayload(payload, key) {
  if (!payload || typeof payload !== 'object') return payload;
  return key in payload ? payload[key] : payload;
}

// Auth
export const loginUser = (data) => apiRequest('POST', '/auth/login', data);
export const registerUser = (data) => apiRequest('POST', '/auth/register', data);
export const getMe = () => apiRequest('GET', '/auth/me');
export const updateProfile = (data) => apiRequest('PUT', '/auth/profile', data);
export const deleteAccount = () => apiRequest('DELETE', '/auth/delete');

// Learning Profile
export const getLearningProfile = () => apiRequest('GET', '/learning-profile');
export const updateLearningProfile = (data) => apiRequest('PUT', '/learning-profile', data);
export const getLearningContext = () => apiRequest('GET', '/learning-context');
export const updateLearningContext = (promptText) =>
  apiRequest('PUT', '/learning-context', { prompt_text: promptText });

// Sessions
export const createSession = async (youtubeUrl) =>
  unwrapPayload(await apiRequest('POST', '/sessions', { youtube_url: youtubeUrl }), 'session');
export const listSessions = async () => unwrapPayload(await apiRequest('GET', '/sessions'), 'sessions');
export const getSession = async (id) => unwrapPayload(await apiRequest('GET', `/sessions/${id}`), 'session');
export const deleteSession = (id) => apiRequest('DELETE', `/sessions/${id}`);

// Checkpoints
export const answerCheckpoint = (sessionId, checkpointId, answer) =>
  apiRequest('POST', `/sessions/${sessionId}/answer`, { checkpoint_id: checkpointId, answer });

// Chat
export const sendChatMessage = (sessionId, message, currentTime) =>
  apiRequest('POST', `/sessions/${sessionId}/chat`, { message, current_time: currentTime });

// Study Materials
export const generateStudyMaterial = async (sessionId, materialTypes) =>
  unwrapPayload(
    await apiRequest('POST', `/sessions/${sessionId}/study-materials`, { material_types: materialTypes }),
    'materials'
  );
export const listStudyMaterials = async (sessionId) =>
  unwrapPayload(await apiRequest('GET', `/sessions/${sessionId}/study-materials`), 'materials');
export const getStudyMaterial = async (sessionId, materialId) =>
  unwrapPayload(await apiRequest('GET', `/sessions/${sessionId}/study-materials/${materialId}`), 'material');

// Recaps
export const getSessionRecap = async (sessionId) =>
  unwrapPayload(await apiRequest('GET', `/sessions/${sessionId}/recap`), 'recap');
export const generateSessionRecap = async (sessionId) =>
  unwrapPayload(await apiRequest('POST', `/sessions/${sessionId}/recap`), 'recap');
