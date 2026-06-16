'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Ban,
  BookOpenCheck,
  HeartPulse,
  ListChecks,
  SendHorizonal,
  Target,
  type LucideIcon
} from 'lucide-react';
import { Banner } from '@/components/ui/Banner';
import { CharacterAvatar } from '@/components/ui/CharacterAvatar';
import { loadCheckIns } from '@/lib/checkin';
import { loadTrainingPlan } from '@/lib/plan';
import { loadProfile, saveProfile } from '@/lib/profile';
import type { UserProfile } from '@/lib/profile';
import type { LibraryTraceability } from '@/lib/ai/response-sources';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  metadata?: LibraryTraceability;
};

type SseEvent = {
  event: string;
  data: {
    text?: string;
    message?: string;
    usedFileSearch?: boolean;
    sourceNames?: string[];
  };
};

function parseSseEvents(buffer: string) {
  const normalizedBuffer = buffer.replace(/\r\n/g, '\n');
  const rawEvents = normalizedBuffer.split('\n\n');
  const remainder = rawEvents.pop() ?? '';
  const events: SseEvent[] = [];

  rawEvents.forEach((rawEvent) => {
    const eventLines = rawEvent.split('\n');
    const eventName =
      eventLines.find((line) => line.startsWith('event:'))?.replace(/^event:\s?/, '') ??
      'message';
    const dataText = eventLines
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.replace(/^data:\s?/, ''))
      .join('\n');

    if (!dataText) return;

    try {
      events.push({
        event: eventName,
        data: JSON.parse(dataText) as SseEvent['data']
      });
    } catch {
      events.push({
        event: 'error',
        data: { message: 'No pudimos leer la respuesta del coach.' }
      });
    }
  });

  return { events, remainder };
}

export function ChatInterface() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [character, setCharacter] = useState<UserProfile['character']>('bill');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: 'Cuéntame qué duda tienes de tu entrenamiento y lo vemos con tu contexto.'
    }
  ]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const showDevelopmentSources = process.env.NODE_ENV !== 'production';

  useEffect(() => {
    const storedProfile = loadProfile();
    const params = new URLSearchParams(window.location.search);
    const requestedCharacter = params.get('character');
    const nextCharacter =
      requestedCharacter === 'bill' || requestedCharacter === 'senda'
        ? requestedCharacter
        : storedProfile?.character ?? 'bill';
    const nextProfile =
      storedProfile && storedProfile.character !== nextCharacter
        ? saveProfile({
            ...storedProfile,
            character: nextCharacter,
            updatedAt: new Date().toISOString()
          })
        : storedProfile;
    const ask = params.get('ask');

    setProfile(nextProfile);
    setCharacter(nextCharacter);
    if (ask) setDraft(ask);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function sendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = draft.trim();
    if (!content || loading) return;

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content }];
    setMessages(nextMessages);
    setDraft('');
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages.slice(-8),
          profile: profile ? { ...profile, character } : null,
          character,
          plan: loadTrainingPlan(),
          checkIns: loadCheckIns().slice(0, 5)
        })
      });

      if (!response.ok || !response.body) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? 'No pudimos responder el mensaje.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let assistantMessage = '';

      setMessages((current) => [...current, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          if (buffer.trim()) {
            const parsed = parseSseEvents(`${buffer}\n\n`);
            parsed.events.forEach((event) => {
              if (event.event === 'delta' && event.data.text) {
                assistantMessage += event.data.text;
              }
              if (event.event === 'done') {
                const metadata = {
                  usedFileSearch: Boolean(event.data.usedFileSearch),
                  sourceNames: event.data.sourceNames ?? []
                };
                setMessages((current) =>
                  current.map((message, index) =>
                    index === current.length - 1 ? { ...message, metadata } : message
                  )
                );
              }
              if (event.event === 'error') {
                throw new Error(event.data.message ?? 'No pudimos responder el mensaje.');
              }
            });
          }
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const parsed = parseSseEvents(buffer);
        buffer = parsed.remainder;

        for (const event of parsed.events) {
          if (event.event === 'delta' && event.data.text) {
            assistantMessage += event.data.text;
            setMessages((current) =>
              current.map((message, index) =>
                index === current.length - 1 ? { ...message, content: assistantMessage } : message
              )
            );
          }
          if (event.event === 'done') {
            const metadata = {
              usedFileSearch: Boolean(event.data.usedFileSearch),
              sourceNames: event.data.sourceNames ?? []
            };
            setMessages((current) =>
              current.map((message, index) =>
                index === current.length - 1 ? { ...message, metadata } : message
              )
            );
          }
          if (event.event === 'error') {
            throw new Error(event.data.message ?? 'No pudimos responder el mensaje.');
          }
        }
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No pudimos responder.');
    } finally {
      setLoading(false);
    }
  }

  function selectCharacter(nextCharacter: UserProfile['character']) {
    setCharacter(nextCharacter);
    if (!profile) return;
    const nextProfile = saveProfile({
      ...profile,
      character: nextCharacter,
      updatedAt: new Date().toISOString()
    });
    setProfile(nextProfile);
  }

  const characterName = character === 'senda' ? 'Senda' : 'Bill';

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="flex min-h-[calc(100vh-9rem)] flex-col space-y-5"
    >
      <header className="flex items-start gap-4">
        <CharacterAvatar character={character} variant="avatar" size="xl" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-cyan">Coach</p>
          <h1 className="text-3xl font-extrabold leading-tight">Habla con {characterName}</h1>
          <p className="text-sm leading-6 text-white/64">
            Usa tu perfil, plan y check-ins más recientes como contexto.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-2">
        <CharacterButton
          active={character === 'bill'}
          character="bill"
          label="Bill"
          description="Directo y práctico"
          onClick={() => selectCharacter('bill')}
        />
        <CharacterButton
          active={character === 'senda'}
          character="senda"
          label="Senda"
          description="Técnica y reflexiva"
          onClick={() => selectCharacter('senda')}
        />
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto rounded-2xl border border-white/8 bg-white/[0.025] p-3">
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={`flex items-end gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.role === 'assistant' ? (
              <CharacterAvatar character={character} variant="avatar" size="sm" className="shrink-0" />
            ) : null}
            <div
              className={[
                'max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-soft',
                message.role === 'user'
                  ? 'whitespace-pre-wrap bg-gradient-cyan text-brand-dark'
                  : 'border border-white/8 bg-brand-elevated/60 text-white/82'
              ].join(' ')}
            >
              {message.role === 'assistant' ? (
                <FormattedCoachMessage content={message.content} />
              ) : (
                message.content
              )}
              {message.role === 'assistant' && message.metadata?.usedFileSearch ? (
                <LibraryTraceBadge
                  sourceNames={message.metadata.sourceNames}
                  showSources={showDevelopmentSources}
                />
              ) : null}
            </div>
          </div>
        ))}
        {loading ? (
          <div className="flex items-end gap-2">
            <CharacterAvatar character={character} variant="avatar" size="sm" className="shrink-0" />
            <div className="inline-flex items-center gap-2 rounded-2xl border border-white/8 bg-brand-elevated/60 px-4 py-3 text-sm text-white/60">
              <span className="size-1.5 animate-pulse rounded-full bg-brand-cyan" />
              <span className="size-1.5 animate-pulse rounded-full bg-brand-cyan [animation-delay:120ms]" />
              <span className="size-1.5 animate-pulse rounded-full bg-brand-cyan [animation-delay:240ms]" />
              <span className="ml-1">Pensando con tu contexto…</span>
            </div>
          </div>
        ) : null}
        <div ref={messagesEndRef} />
      </div>

      {error ? <Banner tone="mustard" icon={AlertTriangle} title="Algo no salió bien" description={error} /> : null}

      <form onSubmit={sendMessage} className="flex gap-2">
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
          rows={2}
          placeholder={`Pregunta a ${characterName} sobre tu sesión, dolor, técnica o plan…`}
          className="min-h-12 min-w-0 flex-1 resize-none rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-white/30 focus:border-brand-cyan/60 focus:bg-white/[0.05]"
        />
        <button
          type="submit"
          disabled={loading || !draft.trim()}
          className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-cyan text-brand-dark shadow-glow transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-white/10 disabled:bg-none disabled:text-white/36 disabled:shadow-none"
          aria-label="Enviar mensaje"
        >
          <SendHorizonal aria-hidden="true" size={20} strokeWidth={2.6} />
        </button>
      </form>
    </motion.section>
  );
}

function CharacterButton({
  active,
  character,
  label,
  description,
  onClick
}: {
  active: boolean;
  character: 'bill' | 'senda';
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex items-center gap-3 rounded-2xl border p-3 text-left transition-all duration-150 active:scale-[0.99]',
        active
          ? 'border-brand-cyan/55 bg-brand-cyan/[0.08] shadow-glow'
          : 'border-white/10 bg-white/[0.03] text-white/70 hover:border-white/22 hover:bg-white/[0.05]'
      ].join(' ')}
    >
      <CharacterAvatar character={character} variant="avatar" size="md" className="shrink-0" />
      <span className="min-w-0">
        <span className="block text-sm font-extrabold text-white">{label}</span>
        <span className="block text-xs text-white/52">{description}</span>
      </span>
    </button>
  );
}

function LibraryTraceBadge({
  sourceNames,
  showSources
}: {
  sourceNames: string[];
  showSources: boolean;
}) {
  return (
    <div className="mt-3 space-y-1 border-t border-white/8 pt-2.5">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-cyan/30 bg-brand-cyan/10 px-2.5 py-1 text-[11px] font-bold text-brand-cyan">
        <BookOpenCheck aria-hidden="true" size={12} strokeWidth={2.4} />
        Basado en biblioteca BilClimb
      </span>
      {showSources && sourceNames.length ? (
        <p className="text-xs leading-5 text-white/46">Fuente: {sourceNames.join(', ')}</p>
      ) : null}
    </div>
  );
}

function cleanInlineMarkdown(value: string) {
  return value
    .replace(/^\s{0,3}#{1,6}\s+/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .trim();
}

type InlineSegment = { text: string; bold: boolean };

function parseInlineBold(value: string): InlineSegment[] {
  const segments: InlineSegment[] = [];
  const regex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(value)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: value.slice(lastIndex, match.index), bold: false });
    }
    segments.push({ text: match[1], bold: true });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < value.length) {
    segments.push({ text: value.slice(lastIndex), bold: false });
  }

  return segments.length ? segments : [{ text: value, bold: false }];
}

function renderInline(value: string) {
  return parseInlineBold(value).map((segment, index) =>
    segment.bold ? (
      <strong key={index} className="font-extrabold text-white">
        {segment.text}
      </strong>
    ) : (
      <span key={index}>{segment.text}</span>
    )
  );
}

function stripListPrefixOnly(value: string) {
  return value.replace(/^[-*•]\s+/, '').replace(/^\d+[.)]\s+/, '');
}

type VisualSection = {
  id: string;
  title: string;
  items: string[];
};

const visualSectionConfig: Record<
  string,
  { title: string; icon: LucideIcon; className: string }
> = {
  objective: {
    title: 'Objetivo',
    icon: Target,
    className: 'border-brand-cyan/24 bg-brand-cyan/10 text-brand-cyan'
  },
  steps: {
    title: 'Pasos',
    icon: ListChecks,
    className: 'border-white/10 bg-white/[0.04] text-white/82'
  },
  feel: {
    title: 'Qué sentir',
    icon: HeartPulse,
    className: 'border-brand-cyan/20 bg-brand-cyan/[0.07] text-brand-cyan'
  },
  avoid: {
    title: 'Evita',
    icon: Ban,
    className: 'border-brand-mustard/24 bg-brand-mustard/10 text-brand-mustard'
  },
  stop: {
    title: 'Detente si',
    icon: AlertTriangle,
    className: 'border-red-400/24 bg-red-400/10 text-red-100'
  },
  general: {
    title: 'Respuesta',
    icon: BookOpenCheck,
    className: 'border-white/10 bg-white/[0.04] text-white/82'
  }
};

function normalizeSectionLabel(value: string) {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/^\d+[.)]\s*/, '')
    .replace(/^[-*•]\s*/, '')
    .replace(/[:.]+$/g, '')
    .trim();
}

function getSectionId(value: string) {
  const normalizedValue = normalizeSectionLabel(cleanInlineMarkdown(value));
  if (['objetivo', 'meta'].includes(normalizedValue)) return 'objective';
  if (['pasos', 'paso a paso', 'como hacerlo', 'como hacer'].includes(normalizedValue))
    return 'steps';
  if (['que sentir', 'que debes sentir', 'sensaciones'].includes(normalizedValue)) return 'feel';
  if (['evita', 'errores comunes', 'no hagas'].includes(normalizedValue)) return 'avoid';
  if (
    ['para si', 'detente si', 'para cuando', 'senales para parar', 'cuando parar'].includes(
      normalizedValue
    )
  )
    return 'stop';
  return null;
}

function stripListPrefix(value: string) {
  return value.replace(/^[-*•]\s+/, '').replace(/^\d+[.)]\s+/, '');
}

function parseVisualCoachSections(content: string) {
  const sections: VisualSection[] = [];
  let activeSection: VisualSection | null = null;

  content
    .replace(/\r\n/g, '\n')
    .split('\n')
    // Quita prefijos de lista pero PRESERVA el **bold** para renderizado
    .map((line) => stripListPrefixOnly(line.trim()))
    .filter(Boolean)
    .forEach((line) => {
      // Para detección de section ID usamos versión sin markdown
      const plainLine = cleanInlineMarkdown(line);
      const colonMatch = plainLine.match(/^([^:]{3,36}):\s*(.+)$/);
      const inlineSectionId = colonMatch ? getSectionId(colonMatch[1]) : null;
      const lineSectionId = getSectionId(plainLine);
      const sectionId = inlineSectionId ?? lineSectionId;

      if (sectionId) {
        activeSection = {
          id: sectionId,
          title: visualSectionConfig[sectionId]?.title ?? plainLine,
          items: []
        };
        sections.push(activeSection);
        if (inlineSectionId && colonMatch?.[2]) {
          // Re-extraer la parte después del ":" del line ORIGINAL (con bold)
          const originalColonMatch = line.match(/^[^:]+:\s*(.+)$/);
          activeSection.items.push(originalColonMatch?.[1] ?? colonMatch[2]);
        }
        return;
      }

      if (!activeSection) {
        activeSection = {
          id: 'general',
          title: visualSectionConfig.general.title,
          items: []
        };
        sections.push(activeSection);
      }

      activeSection.items.push(line);
    });

  return sections
    .map((section) => ({ ...section, items: section.items.filter(Boolean) }))
    .filter((section) => section.items.length > 0);
}

function FormattedCoachMessage({ content }: { content: string }) {
  const visualSections = parseVisualCoachSections(content);
  if (!visualSections.length) {
    return <span className="text-white/42">…</span>;
  }

  // Si todo es "general" (respuesta directa sin secciones), renderizamos plano sin card grande.
  const isAllGeneral = visualSections.every((s) => s.id === 'general');
  if (isAllGeneral) {
    const items = visualSections.flatMap((s) => s.items);
    return <PlainCoachList items={items} />;
  }

  return (
    <div className="space-y-3">
      {visualSections.map((section, sectionIndex) => (
        <CoachVisualCard key={`${section.id}-${sectionIndex}`} section={section} />
      ))}
    </div>
  );
}

function PlainCoachList({ items }: { items: string[] }) {
  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={`${item}-${index}`} className="flex gap-2 text-sm leading-6 text-white/82">
          <span className="mt-2 size-1 shrink-0 rounded-full bg-brand-cyan opacity-80" />
          <span className="min-w-0">{renderInline(item)}</span>
        </div>
      ))}
    </div>
  );
}

function CoachVisualCard({ section }: { section: VisualSection }) {
  const config = visualSectionConfig[section.id] ?? visualSectionConfig.general;
  const Icon = config.icon;
  return (
    <section className={`rounded-xl border p-3 ${config.className}`}>
      <div className="flex items-center gap-2">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/8">
          <Icon aria-hidden="true" size={16} strokeWidth={2.3} />
        </span>
        <h3 className="text-[0.65rem] font-bold uppercase tracking-[0.10em]">{config.title}</h3>
      </div>
      <div className="mt-3 space-y-2">
        {section.items.map((item, index) => (
          <div key={`${item}-${index}`} className="flex gap-2 text-sm leading-6 text-white/82">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-current opacity-80" />
            <span className="min-w-0">{renderInline(item)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
