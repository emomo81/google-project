'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { V0ChatInput } from '@/components/ui/v0-ai-chat';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  image?: string;
  isStreaming?: boolean;
}

const WELCOME: Message = {
  id: 'welcome',
  role: 'assistant',
  content:
    "Hi! I'm Momo AI. I can chat with you, analyse images you upload, and even listen to your voice. Try tapping the 🎤 mic or 📎 image button below!",
};

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(true);

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  /* ── auto-scroll ── */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /* ── speech recognition init ── */
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SR) return;

    const r = new SR();
    r.continuous = false;
    r.interimResults = true;
    r.lang = 'en-US';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    r.onresult = (e: any) => {
      const transcript = Array.from(e.results)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((res: any) => res[0].transcript)
        .join('');
      setInput(transcript);
    };
    r.onend = () => setIsListening(false);
    r.onerror = () => setIsListening(false);
    recognitionRef.current = r;
  }, []);

  /* ── TTS helper ── */
  const speak = useCallback(
    (text: string) => {
      if (!ttsEnabled) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1;
      u.pitch = 1;
      window.speechSynthesis.speak(u);
    },
    [ttsEnabled],
  );

  /* ── mic toggle ── */
  const toggleMic = () => {
    const r = recognitionRef.current;
    if (!r) {
      alert('Speech recognition is not supported in this browser. Try Chrome or Edge.');
      return;
    }
    if (isListening) {
      r.stop();
    } else {
      setInput('');
      r.start();
      setIsListening(true);
    }
  };

  /* ── image select ── */
  const onImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  /* ── send ── */
  const send = async () => {
    const text = input.trim();
    if (!text && !imageFile) return;
    if (isLoading) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      image: imagePreview ?? undefined,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    /* build history (text-only) from existing messages */
    const history = messages
      .filter((m) => m.id !== 'welcome' && m.content)
      .map((m) => ({ role: m.role, content: m.content }));

    const form = new FormData();
    form.append('message', text);
    form.append('history', JSON.stringify(history));
    if (imageFile) form.append('image', imageFile);

    clearImage();

    /* placeholder streaming message */
    const aiId = crypto.randomUUID();
    setMessages((prev) => [
      ...prev,
      { id: aiId, role: 'assistant', content: '', isStreaming: true },
    ]);

    try {
      const res = await fetch('/api/chat', { method: 'POST', body: form });
      if (!res.ok || !res.body) throw new Error('Bad response');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        const snapshot = full;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiId ? { ...m, content: snapshot } : m,
          ),
        );
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiId ? { ...m, isStreaming: false } : m,
        ),
      );
      speak(full);
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiId
            ? { ...m, content: 'Something went wrong. Please try again.', isStreaming: false }
            : m,
        ),
      );
    } finally {
      setIsLoading(false);
    }
  };


  const clearChat = () => {
    window.speechSynthesis.cancel();
    setMessages([WELCOME]);
    clearImage();
  };

  /* ── theme classes ── */
  const bg = darkMode ? 'bg-gray-900' : 'bg-gray-50';
  const surface = darkMode ? 'bg-gray-800' : 'bg-white';
  const border = darkMode ? 'border-gray-700' : 'border-gray-200';
  const text = darkMode ? 'text-gray-100' : 'text-gray-900';
  const subtle = darkMode ? 'text-gray-400' : 'text-gray-500';
  const inputBg = darkMode ? 'bg-gray-700 text-gray-100 placeholder-gray-400' : 'bg-gray-100 text-gray-900 placeholder-gray-400';

  return (
    <div className={`flex flex-col h-screen ${bg} ${text} transition-colors duration-300`}>
      {/* ── Header ── */}
      <header className={`flex items-center justify-between px-4 py-3 ${surface} border-b ${border} shadow-sm`}>
        <div className="flex items-center gap-3">
          {/* Momo AI logo */}
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm shadow">
            M
          </div>
          <div>
            <h1 className="font-semibold text-base leading-tight">Momo AI</h1>
            <p className={`text-xs ${subtle}`}>Vision · Voice · Streaming</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* TTS toggle */}
          <button
            onClick={() => {
              setTtsEnabled((v) => !v);
              window.speechSynthesis.cancel();
            }}
            title={ttsEnabled ? 'Disable voice output' : 'Enable voice output'}
            className={`p-2 rounded-full transition-colors text-lg ${
              ttsEnabled
                ? 'bg-purple-500 text-white'
                : darkMode
                ? 'hover:bg-gray-700 text-gray-400'
                : 'hover:bg-gray-200 text-gray-500'
            }`}
          >
            {ttsEnabled ? '🔊' : '🔇'}
          </button>

          {/* Dark mode */}
          <button
            onClick={() => setDarkMode((v) => !v)}
            title="Toggle theme"
            className={`p-2 rounded-full transition-colors text-lg ${
              darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
            }`}
          >
            {darkMode ? '☀️' : '🌙'}
          </button>

          {/* Clear */}
          <button
            onClick={clearChat}
            title="Clear chat"
            className={`p-2 rounded-full transition-colors text-lg ${
              darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-200 text-gray-500'
            }`}
          >
            🗑️
          </button>
        </div>
      </header>

      {/* ── Messages ── */}
      <main className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {/* avatar */}
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold shrink-0 mt-1 mr-2 shadow">
                M
              </div>
            )}

            <div className={`max-w-[80%] flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              {/* image attachment */}
              {msg.image && (
                <img
                  src={msg.image}
                  alt="uploaded"
                  className="max-w-xs rounded-xl border border-gray-600 shadow"
                />
              )}

              {/* bubble */}
              {(msg.content || msg.isStreaming) && (
                <div
                  className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-br from-blue-600 to-purple-600 text-white rounded-br-sm'
                      : darkMode
                      ? 'bg-gray-700 text-gray-100 rounded-bl-sm'
                      : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm'
                  } ${msg.isStreaming && !msg.content ? 'min-w-[60px]' : ''}`}
                >
                  {msg.content || (
                    <span className="flex gap-1 items-center py-1">
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
                    </span>
                  )}
                  {msg.isStreaming && msg.content && (
                    <span className="inline-block w-0.5 h-4 bg-current ml-0.5 animate-pulse" />
                  )}
                </div>
              )}
            </div>

            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white text-xs font-bold shrink-0 mt-1 ml-2 shadow">
                U
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </main>

      {/* ── Image preview strip ── */}
      {imagePreview && (
        <div className={`px-4 py-2 ${surface} border-t ${border} flex items-center gap-3`}>
          <div className="relative">
            <img src={imagePreview} alt="preview" className="h-16 w-16 object-cover rounded-lg border border-gray-600" />
            <button
              onClick={clearImage}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600"
            >
              ×
            </button>
          </div>
          <p className={`text-xs ${subtle}`}>Image ready — add a question or just send.</p>
        </div>
      )}

      {/* ── Input bar ── */}
      <div className={`px-4 py-4 ${surface} border-t ${border}`}>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onImageChange}
        />
        <V0ChatInput
          value={input}
          onChange={setInput}
          onSend={send}
          onImageClick={() => fileRef.current?.click()}
          onMicClick={toggleMic}
          isLoading={isLoading}
          isListening={isListening}
          hasImage={!!imageFile}
        />
      </div>
    </div>
  );
}
