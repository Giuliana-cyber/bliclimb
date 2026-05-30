import fs from 'node:fs/promises';
import path from 'node:path';
import OpenAI, { toFile } from 'openai';

const envPath = path.join(process.cwd(), '.env.local');

async function loadLocalEnv() {
  try {
    const raw = await fs.readFile(envPath, 'utf8');

    raw.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
        return;
      }

      const index = trimmed.indexOf('=');
      const key = trimmed.slice(0, index).trim();
      const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, '');

      if (key && value && !process.env[key]) {
        process.env[key] = value;
      }
    });
  } catch {
    // .env.local is optional; production/CI should pass env vars directly.
  }
}

function getArgPaths() {
  return process.argv
    .slice(2)
    .filter((arg) => !arg.startsWith('--'))
    .map((filePath) => path.resolve(filePath));
}

async function assertReadablePdf(filePath) {
  const stat = await fs.stat(filePath);

  if (!stat.isFile()) {
    throw new Error(`${filePath} no es un archivo.`);
  }

  if (path.extname(filePath).toLowerCase() !== '.pdf') {
    throw new Error(`${path.basename(filePath)} no parece ser PDF.`);
  }
}

async function main() {
  await loadLocalEnv();

  const apiKey = process.env.OPENAI_API_KEY;
  const vectorStoreId = process.env.OPENAI_VECTOR_STORE_ID;
  const filePaths = getArgPaths();

  if (!apiKey) {
    throw new Error('Falta OPENAI_API_KEY en el entorno.');
  }

  if (!vectorStoreId) {
    throw new Error('Falta OPENAI_VECTOR_STORE_ID en el entorno.');
  }

  if (!filePaths.length) {
    throw new Error('Pasa uno o más PDFs. Ejemplo: node scripts/upload-knowledge-pdfs.mjs ~/Downloads/libro.pdf');
  }

  await Promise.all(filePaths.map(assertReadablePdf));

  const client = new OpenAI({ apiKey });
  const files = await Promise.all(
    filePaths.map(async (filePath) => {
      const bytes = await fs.readFile(filePath);
      return toFile(bytes, path.basename(filePath), { type: 'application/pdf' });
    })
  );

  console.log('VECTOR STORE:', `${vectorStoreId.slice(0, 10)}...`);
  console.log('FILES:', filePaths.map((filePath) => path.basename(filePath)));
  console.log('Uploading and indexing...');

  const batch = await client.vectorStores.fileBatches.uploadAndPoll(
    vectorStoreId,
    { files },
    { maxConcurrency: 2, pollIntervalMs: 2000 }
  );

  console.log('BATCH STATUS:', batch.status);
  console.log('FILE COUNTS:', batch.file_counts);

  if (batch.status !== 'completed' || batch.file_counts?.failed) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : 'No se pudo subir el conocimiento.';
  console.error('ERROR:', message);
  process.exitCode = 1;
});
