export const OPENAI_RATE_LIMIT_MESSAGE =
  'Estamos generando un plan muy completo y alcanzamos el límite temporal de IA. Espera unos segundos y vuelve a intentar.';

export class OpenAIRateLimitError extends Error {
  status = 429;

  constructor(message = OPENAI_RATE_LIMIT_MESSAGE) {
    super(message);
    this.name = 'OpenAIRateLimitError';
  }
}

type RetryableError = {
  status?: number;
  code?: string;
  message?: string;
  headers?: Headers | Record<string, string | string[] | undefined>;
  response?: {
    status?: number;
    headers?: Headers | Record<string, string | string[] | undefined>;
  };
};

function readHeader(error: RetryableError, headerName: string) {
  const headers = error.headers ?? error.response?.headers;

  if (!headers) {
    return null;
  }

  if (typeof (headers as Headers).get === 'function') {
    return (headers as Headers).get(headerName);
  }

  const headerMap = headers as Record<string, string | string[] | undefined>;
  const value = headerMap[headerName] ?? headerMap[headerName.toLowerCase()];

  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function getRetryAfterMs(error: RetryableError) {
  const retryAfter = readHeader(error, 'retry-after');

  if (!retryAfter) {
    return 1200;
  }

  const seconds = Number(retryAfter);

  if (Number.isFinite(seconds)) {
    return Math.max(0, seconds * 1000);
  }

  const dateMs = Date.parse(retryAfter);

  if (Number.isFinite(dateMs)) {
    return Math.max(0, dateMs - Date.now());
  }

  return 1200;
}

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function isOpenAIRateLimitError(error: unknown) {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const retryableError = error as RetryableError;
  const message = retryableError.message?.toLowerCase() ?? '';

  return (
    retryableError.status === 429 ||
    retryableError.response?.status === 429 ||
    retryableError.code === 'rate_limit_exceeded' ||
    (message.includes('rate limit') && message.includes('429'))
  );
}

export async function withOpenAIRetry<T>(
  operation: () => Promise<T>,
  options: { maxRetries?: number } = {}
) {
  const maxRetries = options.maxRetries ?? 2;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (!isOpenAIRateLimitError(error)) {
        throw error;
      }

      if (attempt >= maxRetries) {
        throw new OpenAIRateLimitError();
      }

      const retryAfterMs = getRetryAfterMs(error as RetryableError);
      const jitterMs = 250 + Math.floor(Math.random() * 500);
      await wait(retryAfterMs + jitterMs);
    }
  }

  throw new OpenAIRateLimitError();
}
