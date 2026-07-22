/**
 * ChatView · client · #15.
 *
 * DoD:
 *   - Nav 4 items · Chat activo
 *   - Voz "tú" · Bill anclado en perfil
 *   - REGLA DURA: match de "duele/dolor/lesión" → router.push('/dolor')
 *   - Sin consejo médico en el chat · derivar siempre a /dolor
 *
 * v1: mensajes mock + quick-replies + input. Fase 4b: conectar
 * /api/chat con streaming + guardrails.
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

type Sender = 'coach' | 'user';
interface Message {
  id: string;
  sender: Sender;
  text: string;
}

// Regla dura: cualquier match dispara ruta segura a /dolor
const PAIN_KEYWORDS = [
  'me duele',
  'duele',
  'dolor',
  'lesión',
  'lesion',
  'lastim',
  'molestia',
  'inflam',
];

function isPainMessage(text: string): boolean {
  const norm = text.toLowerCase();
  return PAIN_KEYWORDS.some((k) => norm.includes(k));
}

export interface ChatViewProps {
  character: 'bill' | 'senda';
  profileSummary: {
    grado: string;
    sesionesPorSemana: number;
    capitulo: string;
  };
}

export function ChatView({ character, profileSummary }: ChatViewProps) {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'm0',
      sender: 'coach',
      text: `Hola. Estás en "${profileSummary.capitulo}", nivel ${profileSummary.grado}, ${profileSummary.sesionesPorSemana} sesiones por semana. ¿Qué te ronda hoy?`,
    },
  ]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);

  const quickReplies = [
    { label: '¿Cómo va mi progreso?', text: '¿Cómo va mi progreso?' },
    { label: 'Me duele algo', text: 'Me duele algo' },
    { label: 'Cambiar mi rutina', text: 'Quiero cambiar mi rutina' },
  ];

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, thinking]);

  const send = (text: string) => {
    if (!text.trim()) return;
    if (isPainMessage(text)) {
      // REGLA DURA · sin respuesta médica · ruta segura
      router.push('/dolor');
      return;
    }
    const user: Message = { id: `u-${Date.now()}`, sender: 'user', text: text.trim() };
    setMessages((m) => [...m, user]);
    setInput('');
    setThinking(true);
    // v1 mock reply · Fase 4b conecta con /api/chat
    setTimeout(() => {
      const coachReplies: Record<string, string> = {
        progreso: `Vas parejo. Llevas 2 sesiones esta semana y estás en la #2 del capítulo. Cuando cierres las 3, hacemos retest — sin examen, solo para ver cómo respondes ahora.`,
        rutina: `Puedo ajustar frecuencia, foco o duración desde tu perfil. Dime qué te está pesando: ¿demasiadas sesiones, muy poco tiempo, o quieres cambiar de foco?`,
        default: `Cuéntame más. Estoy aquí para acompañarte en tu entrenamiento, no para reemplazar a un profesional.`,
      };
      const norm = text.toLowerCase();
      const replyText = norm.includes('progreso')
        ? coachReplies.progreso
        : norm.includes('rutina') || norm.includes('cambiar')
          ? coachReplies.rutina
          : coachReplies.default;
      const coach: Message = { id: `c-${Date.now()}`, sender: 'coach', text: replyText };
      setMessages((m) => [...m, coach]);
      setThinking(false);
    }, 700);
  };

  return (
    <div className="min-h-screen bg-bil-cream text-bil-ink font-nunito flex flex-col">
      {/* TopAppBar · coach info */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-bil-cream flex justify-between items-center px-margin-mobile h-touch-target w-full border-b border-bil-ink/5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-bil-green flex-shrink-0">
            <Image
              src={`/characters/${character}-avatar.png`}
              alt={`Coach ${character === 'bill' ? 'Bill' : 'Senda'}`}
              width={40}
              height={40}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="min-w-0">
            <h1 className="text-headline-md-mobile font-bold text-bil-green leading-tight">
              {character === 'bill' ? 'Bill' : 'Senda'}
            </h1>
            <p className="text-label-md text-bil-ink/60">Tu coach</p>
          </div>
        </div>
        <Link
          href="/settings"
          aria-label="Ajustes"
          className="w-10 h-10 rounded-full flex items-center justify-center text-bil-ink/60 hover:bg-bil-ink/5 transition-colors"
        >
          <span className="material-symbols-outlined text-[22px]">settings</span>
        </Link>
      </header>

      {/* Área de mensajes · scroll */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto pt-20 pb-52 px-margin-mobile max-w-lg mx-auto w-full space-y-4"
      >
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} character={character} />
        ))}
        {thinking && <ThinkingBubble character={character} />}
      </div>

      {/* Input area · quick replies + input */}
      <div className="fixed bottom-16 left-0 right-0 z-40 bg-bil-cream border-t border-bil-ink/5 px-margin-mobile pt-3 pb-2">
        <div className="max-w-lg mx-auto space-y-2">
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-2 px-2">
            {quickReplies.map((qr) => (
              <button
                key={qr.text}
                type="button"
                onClick={() => send(qr.text)}
                className="flex-shrink-0 h-9 px-4 rounded-full border-2 border-bil-green/30 text-bil-green text-sm font-semibold hover:bg-bil-green/5 active:scale-95 transition-all"
              >
                {qr.label}
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe a Bill..."
              className="flex-1 h-12 px-4 rounded-full bg-white border-2 border-bil-ink/15 text-bil-ink placeholder:text-bil-ink/40 focus:border-bil-green focus:outline-none text-body-md"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              aria-label="Enviar"
              className="w-12 h-12 rounded-full bg-bil-red text-white flex items-center justify-center shadow-md active:scale-95 transition-transform disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
            >
              <span
                className="material-symbols-outlined text-[24px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                send
              </span>
            </button>
          </form>
        </div>
      </div>

      <BottomNav active="chat" />

      <style jsx global>{`
        .material-symbols-outlined {
          font-family: 'Material Symbols Outlined';
          font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
        html,
        body {
          background: #f2ede3;
        }
      `}</style>
    </div>
  );
}

function MessageBubble({
  message,
  character,
}: {
  message: Message;
  character: 'bill' | 'senda';
}) {
  if (message.sender === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] bg-bil-red text-white p-3 rounded-DEFAULT rounded-tr-none shadow-sm">
          <p className="text-body-md leading-snug">{message.text}</p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex gap-2 items-start">
      <div className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden border-2 border-bil-green">
        <Image
          src={`/characters/${character}-avatar.png`}
          alt={character}
          width={32}
          height={32}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="max-w-[85%] bg-white p-3 rounded-DEFAULT rounded-tl-none shadow-sm border border-bil-ink/5">
        <p className="text-body-md text-bil-ink leading-snug">{message.text}</p>
      </div>
    </div>
  );
}

function ThinkingBubble({ character }: { character: 'bill' | 'senda' }) {
  return (
    <div className="flex gap-2 items-start">
      <div className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden border-2 border-bil-green opacity-60">
        <Image
          src={`/characters/${character}-avatar.png`}
          alt={character}
          width={32}
          height={32}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="bg-white p-3 rounded-DEFAULT rounded-tl-none shadow-sm border border-bil-ink/5">
        <div className="flex gap-1.5">
          {[0, 150, 300].map((delay) => (
            <span
              key={delay}
              className="w-2 h-2 bg-bil-green/50 rounded-full animate-pulse"
              style={{ animationDelay: `${delay}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function BottomNav({ active }: { active: 'hoy' | 'plan' | 'progreso' | 'chat' }) {
  const items = [
    { key: 'hoy' as const, label: 'Hoy', href: '/hoy', icon: 'calendar_today' },
    { key: 'plan' as const, label: 'Plan', href: '/plan-v2', icon: 'map' },
    { key: 'progreso' as const, label: 'Progreso', href: '/progress-v2', icon: 'leaderboard' },
    { key: 'chat' as const, label: 'Chat', href: '/chat-v2', icon: 'forum' },
  ];
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex justify-around items-center px-base h-16 bg-white border-t border-bil-ink/10 shadow-sm"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {items.map((it) => {
        const isActive = it.key === active;
        return (
          <Link
            key={it.key}
            href={it.href}
            className={
              isActive
                ? 'flex flex-col items-center justify-center bg-bil-green/10 text-bil-green rounded-xl px-4 py-1 scale-95'
                : 'flex flex-col items-center justify-center text-bil-ink/60 px-4 py-1 hover:bg-bil-ink/5 transition-colors'
            }
          >
            <span
              className="material-symbols-outlined"
              style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              {it.icon}
            </span>
            <span className="text-label-md">{it.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
