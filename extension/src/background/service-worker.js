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
    await setToken(data.token);
    return { success: true, user: data.user };
  },

  [MSG.AUTH_REGISTER]: async (msg) => {
    const data = await api.registerUser({ email: msg.email, password: msg.password, name: msg.name });
    await setToken(data.token);
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
      return { authenticated: true, user: data.user };
    } catch {
      await clearToken();
      return { authenticated: false };
    }
  },

  [MSG.UPDATE_PROFILE]: async (msg) => {
    return api.updateProfile(msg.data);
  },

  [MSG.DELETE_ACCOUNT]: async () => {
    const result = await api.deleteAccount();
    await clearToken();
    await chrome.storage.local.remove(STORAGE_KEYS.ACTIVE_SESSION);
    return result;
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

  [MSG.END_SESSION]: async () => {
    await chrome.storage.local.remove(STORAGE_KEYS.ACTIVE_SESSION);
    broadcast(MSG.SESSION_CREATED, { session: null });
    return { success: true };
  },

  // UI
  [MSG.OPEN_SIDE_PANEL]: async (msg, sender) => {
    try {
      const tabId = sender?.tab?.id
        ?? (await chrome.tabs.query({ active: true, currentWindow: true }))[0]?.id;
      if (!tabId) {
        console.error('Failed to get tab ID for side panel');
        return { success: false, error: 'No active tab found' };
      }
      await chrome.sidePanel.open({ tabId });
      return { success: true };
    } catch (err) {
      console.error('Failed to open side panel:', err);
      return { success: false, error: err.message };
    }
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
