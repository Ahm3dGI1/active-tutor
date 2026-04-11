import { STORAGE_KEYS } from './constants.js';

/**
 * Get the stored auth token
 */
export async function getToken() {
  const result = await chrome.storage.local.get(STORAGE_KEYS.AUTH_TOKEN);
  return result[STORAGE_KEYS.AUTH_TOKEN] || null;
}

/**
 * Store the auth token
 */
export async function setToken(token) {
  await chrome.storage.local.set({ [STORAGE_KEYS.AUTH_TOKEN]: token });
}

/**
 * Remove the auth token
 */
export async function clearToken() {
  await chrome.storage.local.remove(STORAGE_KEYS.AUTH_TOKEN);
}

/**
 * Get the API base URL (configurable)
 */
export async function getApiUrl() {
  const result = await chrome.storage.local.get(STORAGE_KEYS.API_URL);
  return result[STORAGE_KEYS.API_URL] || 'http://localhost:5000/api';
}

/**
 * Set the API base URL
 */
export async function setApiUrl(url) {
  await chrome.storage.local.set({ [STORAGE_KEYS.API_URL]: url });
}
