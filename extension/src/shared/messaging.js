// Chrome extension message passing helpers

/**
 * Send a message to the service worker (background script)
 */
export function sendToBackground(type, data = {}) {
  return chrome.runtime.sendMessage({ type, ...data });
}

/**
 * Send a message to the content script in the active tab
 */
export async function sendToContentScript(type, data = {}) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error('No active tab found');
  return chrome.tabs.sendMessage(tab.id, { type, ...data });
}

/**
 * Send a message to all extension contexts (tabs, popup, sidepanel)
 */
export async function broadcast(type, data = {}) {
  // Send to all tabs with content scripts
  const tabs = await chrome.tabs.query({ url: 'https://www.youtube.com/*' });
  for (const tab of tabs) {
    chrome.tabs.sendMessage(tab.id, { type, ...data }).catch(() => {});
  }
}

/**
 * Listen for messages of a specific type
 */
export function onMessage(type, handler) {
  const listener = (message, sender, sendResponse) => {
    if (message.type === type) {
      const result = handler(message, sender);
      if (result instanceof Promise) {
        result.then(sendResponse).catch((err) => sendResponse({ error: err.message }));
        return true; // keep channel open for async response
      }
      sendResponse(result);
    }
  };
  chrome.runtime.onMessage.addListener(listener);
  return () => chrome.runtime.onMessage.removeListener(listener);
}

/**
 * Listen for messages of any type, dispatching to handlers map
 */
export function onMessages(handlers) {
  const listener = (message, sender, sendResponse) => {
    const handler = handlers[message.type];
    if (handler) {
      const result = handler(message, sender);
      if (result instanceof Promise) {
        result.then(sendResponse).catch((err) => sendResponse({ error: err.message }));
        return true;
      }
      sendResponse(result);
    }
  };
  chrome.runtime.onMessage.addListener(listener);
  return () => chrome.runtime.onMessage.removeListener(listener);
}
