import { useEffect, useRef, useState } from 'react';
import { TopBar } from '@/components/TopBar';
import { Send, Sparkles } from 'lucide-react';
import { listMessages, saveMessage } from '@/lib/db';
import { chatWithIzy } from '@/lib/ai';
import { uid } from '@/lib/quote';
import type { ChatMessage, ModeName } from '@/types';

type Props = {
  onNavigate: (m: ModeName) => void;
  initialMessage?: string;
};

export function ModeIzyMode({ onNavigate, initialMessage }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const autoSentRef = useRef(false);

  useEffect(() => {
    listMessages().then(setMessages);
  }, []);

  // Auto-envoi du message initial si on vient du noyau
  useEffect(() => {
    if (initialMessage && initialMessage.trim() && !autoSentRef.current) {
      autoSentRef.current = true;
      sendMessage(initialMessage.trim());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMessage]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking]);

  const sendMessage = async (text: string) => {
    if (!text || thinking) return;
    const userMsg: ChatMessage = { id: uid(), role: 'user', content: text, timestamp: Date.now() };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    await saveMessage(userMsg);
    setThinking(true);
    try {
      const reply = await chatWithIzy(next);
      const izyMsg: ChatMessage = { id: uid(), role: 'izy', content: reply, timestamp: Date.now() };
      setMessages([...next, izyMsg]);
      await saveMessage(izyMsg);
    } finally {
      setThinking(false);
    }
  };

  const send = () => sendMessage(input.trim());

  const suggestions = [
    'Quel taux de TVA pour une rénovation ?',
    "Comment relancer un client qui ne paie pas ?",
    "Aide-moi à rédiger un email pro",
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar onBack={() => onNavigate('home')} title="MODE IZY" />

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {messages.length === 0 && !thinking && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
              style={{
                background: 'rgba(139,92,246,0.10)',
                border: '1px solid rgba(139,92,246,0.30)',
              }}
            >
              <Sparkles size={20} style={{ color: '#C4B5FD' }} />
            </div>
            <h2 className="font-display text-2xl mb-2" style={{ letterSpacing: '-0.02em' }}>
              Pose-moi une <span className="italic" style={{ color: '#A78BFA' }}>question</span>.
            </h2>
            <p className="text-sm mb-6 max-w-xs" style={{ color: 'var(--ink-dim)' }}>
              Je connais ton métier. Devis, TVA, conformité, droit du travail, gestion d'équipe…
            </p>
            <div className="w-full max-w-md space-y-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => setInput(s)}
                  className="w-full text-left p-3 rounded-2xl text-sm"
                  style={{
                    color: 'var(--ink-dim)',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--line-mid)',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.length > 0 && (
          <div className="space-y-3 max-w-2xl mx-auto pt-2">
            {messages.map((m) => (
              <Bubble key={m.id} msg={m} />
            ))}
            {thinking && <Thinking />}
            <div ref={endRef} />
          </div>
        )}
      </div>

      <div className="safe-bottom px-4 pb-4 pt-2">
        <div className="rounded-2xl flex items-end gap-2 p-2" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--line-mid)' }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Parle à IZY…"
            rows={1}
            className="flex-1 bg-transparent px-3 py-3 text-sm resize-none max-h-32"
          />
          <button
            onClick={send}
            disabled={!input.trim() || thinking}
            className="btn-violet w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 disabled:opacity-40"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

function Bubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} fade-in`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap`}
        style={
          isUser
            ? { background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)', color: 'white' }
            : { background: 'rgba(255,255,255,0.05)', border: '1px solid var(--line-mid)' }
        }
      >
        {msg.content}
      </div>
    </div>
  );
}

function Thinking() {
  return (
    <div className="flex justify-start fade-in">
      <div
        className="rounded-2xl px-4 py-3 flex gap-1.5"
        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--line-mid)' }}
      >
        <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#C4B5FD' }} />
        <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#C4B5FD', animationDelay: '0.15s' }} />
        <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#C4B5FD', animationDelay: '0.3s' }} />
      </div>
    </div>
  );
}
