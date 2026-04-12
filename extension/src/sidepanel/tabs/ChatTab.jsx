import React, { useState, useRef, useEffect } from 'react';
import { sendToBackground, sendToContentScript } from '../../shared/messaging.js';
import { MSG } from '../../shared/constants.js';

export default function ChatTab({ session }) {
  const [messages, setMessages] = useState(session.chat_messages || []);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    const msg = input.trim();
    if (!msg || loading) return;

    // Optimistically add user message
    const userMsg = { id: Date.now(), role: 'user', content: msg, created_at: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // Get current video time from content script
      let currentTime = 0;
      try {
        const timeRes = await sendToContentScript(MSG.GET_CURRENT_TIME);
        currentTime = timeRes?.currentTime || 0;
      } catch {
        // Content script might not be available
      }

      const res = await sendToBackground(MSG.SEND_CHAT, {
        sessionId: session.id,
        message: msg,
        currentTime,
      });

      if (res.error) throw new Error(res.error);

      // Replace optimistic message with real ones
      setMessages((prev) => {
        const filtered = prev.filter((m) => m.id !== userMsg.id);
        return [...filtered, res.user_message, res.message];
      });
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'assistant',
          content: 'Sorry, something went wrong. Please try again.',
          created_at: new Date().toISOString(),
        },
      ]);
    }

    setLoading(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-surface-400 text-sm mt-8">
            <div className="w-12 h-12 bg-surface-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">💬</span>
            </div>
            <p className="font-medium text-surface-500">Ask me anything about the video!</p>
            <p className="text-xs mt-1 text-surface-400">I have full context of the transcript.</p>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-primary-700 text-white rounded-2xl rounded-br-md'
                  : 'bg-surface-100 text-surface-800 rounded-2xl rounded-bl-md'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-surface-100 text-surface-500 px-4 py-2.5 rounded-2xl rounded-bl-md text-sm">
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-surface-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-1.5 h-1.5 bg-surface-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-1.5 h-1.5 bg-surface-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-3 border-t border-surface-100">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about the video..."
            className="flex-1 px-4 py-2.5 border border-surface-200 rounded-lg bg-surface-50 text-sm focus:bg-white focus:ring-2 focus:ring-primary-200 focus:border-primary-400 transition outline-none"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="bg-primary-700 text-white p-2.5 rounded-lg hover:bg-primary-600 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}
