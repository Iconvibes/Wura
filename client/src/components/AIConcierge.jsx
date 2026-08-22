import { useState, useRef, useEffect, useCallback } from 'react';
import { api } from '../api.jsx';

// Initial suggestions for first message
const INITIAL_SUGGESTIONS = [
  'What time is check-in?',
  'Do you have parking?',
  'Tell me about the spa',
  'Where can I eat?',
  'What is the WiFi password?',
];

// Helper to format message text with line breaks
function formatMessage(text) {
  return text.split('\n').map((line, i) => (
    <span key={i}>
      {i > 0 && <br />}
      {line}
    </span>
  ));
}

export default function AIConcierge() {
  const [open, setOpen] = useState(() => {
    // Persist open state in localStorage
    try {
      return localStorage.getItem('wura-concierge-open') === 'true';
    } catch {
      return false;
    }
  });
  const [messages, setMessages] = useState([
    { 
      sender: 'ai', 
      text: 'Hello! I\u2019m your De Wura & Alfred concierge. I can help with rooms, amenities, bookings, or anything else you need.',
      suggestions: INITIAL_SUGGESTIONS,
      timestamp: new Date()
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Persist open state
  useEffect(() => {
    try {
      localStorage.setItem('wura-concierge-open', String(open));
    } catch {}
  }, [open]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading]);

  // Focus input when opened
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const send = useCallback(async (text, skipUserMessage = false) => {
    if (!text.trim() || loading) return;
    
    const userMsg = { 
      sender: 'guest', 
      text: text.trim(),
      timestamp: new Date()
    };
    
    if (!skipUserMessage) {
      setMessages((prev) => [...prev, userMsg]);
    }
    setInput('');
    setLoading(true);
    setIsTyping(true);
    
    try {
      const data = await api('/api/ai-concierge', { 
        method: 'POST', 
        body: JSON.stringify({ 
          message: text.trim(),
          context: {
            // Could pass booking ref, page context, etc.
          }
        }) 
      });
      
      // Simulate typing delay for natural feel
      await new Promise(r => setTimeout(r, 500 + Math.random() * 500));
      
      setMessages((prev) => [...prev, { 
        sender: 'ai', 
        text: data.answer,
        suggestions: data.suggestions || [],
        source: data.source,
        timestamp: new Date()
      }]);
    } catch {
      setMessages((prev) => [...prev, { 
        sender: 'ai', 
        text: 'I apologize, but I encountered an issue. Please try again or contact the front desk directly.',
        suggestions: ['Contact front desk', 'Try again'],
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
      setIsTyping(false);
    }
  }, [loading]);

  const handleSubmit = (e) => {
    e.preventDefault();
    send(input);
  };

  const handleSuggestionClick = (suggestion) => {
    send(suggestion);
  };

  // Get current suggestions (from last AI message or initial)
  const currentSuggestions = messages.length > 0 
    ? [...messages].reverse().find(m => m.sender === 'ai' && m.suggestions?.length > 0)?.suggestions || []
    : INITIAL_SUGGESTIONS;

  return (
    <>
      {/* Floating button with pulse animation */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 shadow-lg shadow-gold-500/30 flex items-center justify-center text-navy-950 font-bold text-xl hover:scale-105 transition-all duration-300"
        aria-label="AI Concierge"
        title="Chat with our concierge"
        style={{
          animation: open ? 'none' : 'pulse-gold 2s infinite'
        }}
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div 
          className="fixed bottom-24 right-6 z-50 w-[380px] max-w-[calc(100vw-3rem)] rounded-2xl shadow-2xl shadow-black/40 overflow-hidden border border-white/10"
          style={{ 
            background: 'var(--color-navy-950)',
            animation: 'slide-up 0.3s ease-out'
          }}>
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-navy-900 to-navy-950 border-b border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center text-navy-950 font-bold text-sm">W</div>
                  <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-400 border-2 border-navy-900" />
                </div>
                <div>
                  <div className="text-[14px] font-bold text-cream">Wura Concierge</div>
                  <div className="text-[11px] text-dim">Always available to help</div>
                </div>
              </div>
              <button 
                onClick={() => setOpen(false)}
                className="text-dim hover:text-cream transition-colors p-1">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="h-[350px] overflow-y-auto p-4 space-y-4" style={{ scrollBehavior: 'smooth' }}>
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.sender === 'guest' ? 'justify-end' : 'justify-start'}`}>
                {m.sender === 'ai' && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gold-400/20 to-gold-600/20 flex items-center justify-center text-gold-400 text-xs font-bold mr-2 mt-1 flex-shrink-0">
                    W
                  </div>
                )}
                <div className={`max-w-[85%] ${m.sender === 'guest' ? 'order-1' : ''}`}>
                  <div className={`px-4 py-3 rounded-2xl text-[13px] leading-relaxed ${
                    m.sender === 'guest'
                      ? 'bg-gradient-to-br from-gold-500/20 to-gold-600/20 text-cream rounded-br-md border border-gold-500/10'
                      : 'bg-white/5 text-cream/90 border border-white/10 rounded-bl-md'
                  }`}>
                    {formatMessage(m.text)}
                  </div>
                  {/* Timestamp */}
                  <div className={`text-[10px] text-dim/60 mt-1 ${m.sender === 'guest' ? 'text-right' : 'text-left'}`}>
                    {m.timestamp?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
            
            {/* Typing indicator */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gold-400/20 to-gold-600/20 flex items-center justify-center text-gold-400 text-xs font-bold mr-2 flex-shrink-0">
                  W
                </div>
                <div className="bg-white/5 border border-white/10 px-4 py-3 rounded-2xl rounded-bl-md">
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-gold-400/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full bg-gold-400/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 rounded-full bg-gold-400/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Suggestion chips */}
          {currentSuggestions.length > 0 && !loading && (
            <div className="px-4 pb-3 flex flex-wrap gap-2">
              {currentSuggestions.map((q, idx) => (
                <button 
                  key={`${q}-${idx}`} 
                  onClick={() => handleSuggestionClick(q)}
                  className="text-[11px] px-3 py-1.5 rounded-full bg-gold-500/10 text-gold-300 border border-gold-500/20 hover:bg-gold-500/20 hover:border-gold-500/30 transition-all duration-200 hover:scale-105"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input area */}
          <form onSubmit={handleSubmit} className="p-3 border-t border-white/10">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about the hotel..."
                className="flex-1 rounded-xl text-[13px] bg-navy-900 border border-white/10 text-cream placeholder-dim/50 focus:outline-none focus:border-gold-500/30 focus:ring-1 focus:ring-gold-500/20 transition-all"
                style={{ padding: '12px 16px' }}
                disabled={loading}
              />
              <button 
                type="submit" 
                disabled={loading || !input.trim()}
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 text-navy-950 font-bold flex items-center justify-center hover:from-gold-500 hover:to-gold-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {loading ? (
                  <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.3" />
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                  </svg>
                )}
              </button>
            </div>
            <div className="mt-2 text-center">
              <button
                type="button"
                onClick={() => {
                  setMessages([{
                    sender: 'ai',
                    text: 'Hello! I\u2019m your De Wura & Alfred concierge. I can help with rooms, amenities, bookings, or anything else you need.',
                    suggestions: INITIAL_SUGGESTIONS,
                    timestamp: new Date()
                  }]);
                }}
                className="text-[10px] text-dim/50 hover:text-dim transition-colors"
              >
                Start new conversation
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
