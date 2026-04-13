import { onMessages, broadcast } from '../shared/messaging.js';
import { getToken, setToken, clearToken } from '../shared/auth.js';
import { MSG, STORAGE_KEYS } from '../shared/constants.js';
import * as api from '../shared/api.js';

// Open side panel when extension icon is clicked
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });

// Message handlers
onMessages({
  // Auth
  [MSG.AUTH_LOGIN]: async (msg) => {
    const data = await api.loginUser({ email: msg.email, password: msg.password });
    await setToken(data.access_token);
    return { success: true, user: data.user };
  },

  [MSG.AUTH_REGISTER]: async (msg) => {
    const data = await api.registerUser({ email: msg.email, password: msg.password, name: msg.name });
    await setToken(data.access_token);
    return { success: true, user: data.user };
  },

  [MSG.AUTH_LOGOUT]: async () => {
    await clearToken();
    return { success: true };
  },

  [MSG.AUTH_STATUS]: async () => {
    const token = await getToken();
    if (!token) return { authenticated: false };
    try {
      const data = await api.getMe();
      return { authenticated: true, user: data };
    } catch {
      await clearToken();
      return { authenticated: false };
    }
  },

  [MSG.UPDATE_PROFILE]: async (msg) => {
    return api.updateProfile(msg.data);
  },

  // Sessions
  [MSG.CREATE_SESSION]: async (msg) => {
    const data = await api.createSession(msg.youtubeUrl);
    // Store active session
    await chrome.storage.local.set({ [STORAGE_KEYS.ACTIVE_SESSION]: data });
    // Broadcast to content script and side panel
    broadcast(MSG.SESSION_CREATED, { session: data });
    return data;
  },

  [MSG.GET_SESSION]: async (msg) => {
    return api.getSession(msg.sessionId);
  },

  [MSG.LIST_SESSIONS]: async () => {
    return api.listSessions();
  },

  [MSG.DELETE_SESSION]: async (msg) => {
    return api.deleteSession(msg.sessionId);
  },

  // Checkpoints
  [MSG.ANSWER_CHECKPOINT]: async (msg) => {
    return api.answerCheckpoint(msg.sessionId, msg.checkpointId, msg.answer);
  },

  // Chat
  [MSG.SEND_CHAT]: async (msg) => {
    return api.sendChatMessage(msg.sessionId, msg.message, msg.currentTime);
  },

  // Study Materials
  [MSG.GENERATE_MATERIALS]: async (msg) => {
    return api.generateStudyMaterial(msg.sessionId, msg.materialTypes);
  },

  [MSG.LIST_MATERIALS]: async (msg) => {
    return api.listStudyMaterials(msg.sessionId);
  },

  [MSG.GET_MATERIAL]: async (msg) => {
    return api.getStudyMaterial(msg.sessionId, msg.materialId);
  },

  // Recaps
  [MSG.GET_RECAP]: async (msg) => {
    return api.getSessionRecap(msg.sessionId);
  },

  [MSG.GENERATE_RECAP]: async (msg) => {
    return api.generateSessionRecap(msg.sessionId);
  },

  // Learning Profile
  [MSG.GET_LEARNING_PROFILE]: async () => {
    return api.getLearningProfile();
  },

  [MSG.UPDATE_LEARNING_PROFILE]: async (msg) => {
    return api.updateLearningProfile(msg.data);
  },

  [MSG.GET_LEARNING_CONTEXT]: async () => {
    return api.getLearningContext();
  },

  [MSG.UPDATE_LEARNING_CONTEXT]: async (msg) => {
    return api.updateLearningContext(msg.promptText);
  },
});

console.log('Hermex service worker loaded');
