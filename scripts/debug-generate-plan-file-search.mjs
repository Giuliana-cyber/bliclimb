import OpenAI from "openai";
import fs from "node:fs";

function loadEnvFile(path) {
  if (!fs.existsSync(path)) return;
  const lines = fs.readFileSync(path, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;

    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

function collectAnnotations(value, output = []) {
  if (!value || typeof value !== "object") return output;

  if (Array.isArray(value)) {
    for (const item of value) collectAnnotations(item, output);
    return output;
  }

  if (Array.isArray(value.annotations)) {
    output.push(...value.annotations);
  }

  for (const nested of Object.values(value)) {
    collectAnnotations(nested, output);
  }

  return output;
}

loadEnvFile(".env.local");

const apiKey = process.env.OPENAI_API_KEY;
const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
const vectorStoreId = process.env.OPENAI_VECTOR_STORE_ID;

if (!apiKey) {
  console.error("Missing OPENAI_API_KEY");
  process.exit(1);
}

if (!vectorStoreId) {
  console.error("Missing OPENAI_VECTOR_STORE_ID");
  process.exit(1);
}

const openai = new OpenAI({ apiKey });

const response = await openai.responses.create({
  model,
  input: [
    {
      role: "system",
      content:
        "Eres BilClimb.ai. Para generar planes debes consultar primero la biblioteca con file_search. No inventes fuentes y no muestres chunks raw.",
    },
    {
      role: "user",
      content:
        "Genera un resumen de plan de entrenamiento de 1 semana para escalada en roca, en español, usando la biblioteca de BilClimb. Perfil: 3 días disponibles, sin climbing gym, sin hangboard, equipo: bandas y barra, dolor de dedos 2/10. Devuelve objetivo, sesiones y criterios de seguridad.",
    },
  ],
  tools: [
    {
      type: "file_search",
      vector_store_ids: [vectorStoreId],
    },
  ],
});

const output = response.output || [];
const outputTypes = output.map((item) => item.type);
const fileSearchCalls = output.filter((item) => item.type === "file_search_call");
const annotations = collectAnnotations(response);

console.log("MODEL:", model);
console.log("VECTOR STORE prefix:", `${vectorStoreId.slice(0, 10)}...`);
console.log("OUTPUT TYPES:", outputTypes);
console.log("FILE_SEARCH_CALLS:", fileSearchCalls.length);
console.log(
  "ANNOTATIONS:",
  annotations.map((annotation) => ({
    type: annotation.type,
    file_id: annotation.file_id,
    filename: annotation.filename,
    index: annotation.index,
  }))
);

console.log("\nPLAN PREVIEW:\n");
console.log((response.output_text || "").slice(0, 1800));
