'use client';

import { useEffect, useRef, useState } from 'react';
import { BookOpenCheck, SendHorizonal, UserRound } from 'lucide-react';
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

    if (!dataText) {
      return;
    }

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

    if (ask) {
      setDraft(ask);
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function sendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const content = draft.trim();

    if (!content || loading) {
      return;
    }

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content }];
    setMessages(nextMessages);
    setDraft('');
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: nextMessages.slice(-8),
          profile: profile ? { ...profile, character } : null,
          character
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

    if (!profile) {
      return;
    }

    const nextProfile = saveProfile({
      ...profile,
      character: nextCharacter,
      updatedAt: new Date().toISOString()
    });

    setProfile(nextProfile);
  }

  return (
    <section className="flex min-h-[calc(100vh-9rem)] flex-col">
      <div className="mb-5">
        <p className="text-sm font-semibold text-brand-cyan">Chat Coach</p>
        <h1 className="mt-2 text-3xl font-bold">
          Habla con {character === 'senda' ? 'Senda' : 'Bill'}
        </h1>
        <p className="mt-2 text-sm leading-6 text-white/58">
          Usa tu perfil y la biblioteca de entrenamiento de BilClimb para responder con contexto.
        </p>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2">
        <CharacterButton
          active={character === 'bill'}
          label="Bill"
          description="Directo y práctico"
          onClick={() => selectCharacter('bill')}
        />
        <CharacterButton
          active={character === 'senda'}
          label="Senda"
          description="Técnica y reflexiva"
          onClick={() => selectCharacter('senda')}
        />
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto rounded-lg border border-white/10 bg-white/[0.03] p-3">
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={[
              'max-w-[86%] whitespace-pre-wrap rounded-lg px-4 py-3 text-sm leading-6',
              message.role === 'user'
                ? 'ml-auto bg-brand-cyan text-brand-dark'
                : 'mr-auto border border-white/10 bg-brand-dark/58 text-white/78'
            ].join(' ')}
          >
            {message.content}
            {message.role === 'assistant' && message.metadata?.usedFileSearch ? (
              <LibraryTraceBadge
                sourceNames={message.metadata.sourceNames}
                showSources={showDevelopmentSources}
              />
            ) : null}
          </div>
        ))}
        {loading ? (
          <div className="mr-auto rounded-lg border border-white/10 bg-brand-dark/58 px-4 py-3 text-sm text-white/58">
            Pensando con tu contexto...
          </div>
        ) : null}
        <div ref={messagesEndRef} />
      </div>

      {error ? (
        <div className="mt-3 rounded-md border border-brand-mustard/30 bg-brand-mustard/10 p-3 text-sm text-white/78">
          {error}
        </div>
      ) : null}

      <form onSubmit={sendMessage} className="mt-4 flex gap-2">
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
          placeholder="Pregunta algo sobre tu sesión, dolor, técnica o plan..."
          className="min-h-12 min-w-0 flex-1 resize-none rounded-md border border-white/10 bg-white/[0.04] px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-white/34 focus:border-brand-cyan"
        />
        <button
          type="submit"
          disabled={loading || !draft.trim()}
          className="grid size-12 shrink-0 place-items-center rounded-md bg-brand-cyan text-brand-dark transition hover:bg-brand-cyan/90 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/36"
          aria-label="Enviar mensaje"
          title="Enviar"
        >
          <SendHorizonal aria-hidden="true" size={20} strokeWidth={2.6} />
        </button>
      </form>
    </section>
  );
}

function CharacterButton({
  active,
  label,
  description,
  onClick
}: {
  active: boolean;
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex items-center gap-3 rounded-md border p-3 text-left transition',
        active
          ? 'border-brand-cyan bg-brand-cyan/12 text-white'
          : 'border-white/10 bg-white/[0.03] text-white/68 hover:border-white/24'
      ].join(' ')}
    >
      <span
        className={[
          'grid size-9 shrink-0 place-items-center rounded-md',
          active ? 'bg-brand-cyan text-brand-dark' : 'bg-white/8 text-white/58'
        ].join(' ')}
      >
        <UserRound aria-hidden="true" size={18} strokeWidth={2.4} />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-bold">{label}</span>
        <span className="block text-xs text-white/48">{description}</span>
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
    <div className="mt-3 space-y-1 border-t border-white/10 pt-2">
      <span className="inline-flex items-center gap-1.5 rounded-md border border-brand-cyan/25 bg-brand-cyan/10 px-2 py-1 text-[11px] font-bold text-brand-cyan">
        <BookOpenCheck aria-hidden="true" size={13} strokeWidth={2.4} />
        Basado en biblioteca BilClimb
      </span>
      {showSources && sourceNames.length ? (
        <p className="text-xs leading-5 text-white/46">Fuente: {sourceNames.join(', ')}</p>
      ) : null}
    </div>
  );
}
