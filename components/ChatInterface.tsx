'use client';

import { useEffect, useRef, useState } from 'react';
import { SendHorizonal } from 'lucide-react';
import { loadProfile } from '@/lib/profile';
import type { UserProfile } from '@/lib/profile';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export function ChatInterface() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
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

  useEffect(() => {
    setProfile(loadProfile());
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
          profile
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
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() ?? '';

        for (const rawEvent of events) {
          const eventName = rawEvent
            .split('\n')
            .find((line) => line.startsWith('event: '))
            ?.replace('event: ', '');
          const dataLine = rawEvent
            .split('\n')
            .find((line) => line.startsWith('data: '))
            ?.replace('data: ', '');

          if (!dataLine) {
            continue;
          }

          const data = JSON.parse(dataLine) as { text?: string; message?: string };

          if (eventName === 'delta' && data.text) {
            assistantMessage += data.text;
            setMessages((current) =>
              current.map((message, index) =>
                index === current.length - 1 ? { ...message, content: assistantMessage } : message
              )
            );
          }

          if (eventName === 'error') {
            throw new Error(data.message ?? 'No pudimos responder el mensaje.');
          }
        }
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No pudimos responder.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="flex min-h-[calc(100vh-9rem)] flex-col">
      <div className="mb-5">
        <p className="text-sm font-semibold text-brand-cyan">Chat Coach</p>
        <h1 className="mt-2 text-3xl font-bold">
          Habla con {profile?.character === 'senda' ? 'Senda' : 'Bill'}
        </h1>
        <p className="mt-2 text-sm leading-6 text-white/58">
          Usa tu perfil y la biblioteca de entrenamiento de BilClimb para responder con contexto.
        </p>
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
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Pregunta algo sobre tu sesión, dolor, técnica o plan..."
          className="h-12 min-w-0 flex-1 rounded-md border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none transition placeholder:text-white/34 focus:border-brand-cyan"
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
