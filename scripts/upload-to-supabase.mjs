// =============================================================
// SCRIPT: upload-to-supabase.mjs
// =============================================================
// Lee los chunks del JSON, genera embeddings con HuggingFace,
// y los sube a Supabase para que el agente pueda buscar leyes.
//
// ¿Qué es un embedding?
// Es convertir texto como "prestaciones laborales" en una lista
// de 384 números como [0.23, -0.45, 0.87, ...].
// Textos con significado parecido tienen números parecidos.
// Así podemos buscar por SIGNIFICADO, no solo por palabras exactas.
// =============================================================

import fs from "fs";
import path from "path";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { createClient } = require("@supabase/supabase-js");

const CHUNKS_FILE = path.join(process.cwd(), "data", "chunks.json");

// Conectar con Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const HF_TOKEN = process.env.HUGGINGFACE_API_KEY;

// Genera embeddings usando HuggingFace (gratis)
// El modelo "all-MiniLM-L6-v2" es pequeño, rápido y bueno para buscar textos similares
async function getEmbeddings(texts) {
  const response = await fetch(
    "https://router.huggingface.co/hf-inference/models/sentence-transformers/all-MiniLM-L6-v2/pipeline/feature-extraction",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HF_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inputs: texts }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`HuggingFace error: ${response.status} - ${error}`);
  }

  return response.json();
}

async function main() {
  console.log("🚀 Subiendo leyes a Supabase...\n");

  // 1. Leer los chunks
  const chunks = JSON.parse(fs.readFileSync(CHUNKS_FILE, "utf-8"));
  console.log(`📦 ${chunks.length} chunks a procesar\n`);

  // 2. Procesar en lotes de 20 (para no sobrecargar la API)
  const BATCH_SIZE = 20;
  let uploaded = 0;

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const texts = batch.map((c) => c.content);

    try {
      // 3. Generar embeddings para este lote
      const embeddings = await getEmbeddings(texts);

      // 4. Preparar los datos para Supabase
      const rows = batch.map((chunk, j) => ({
        id: chunk.id,
        content: chunk.content,
        source: chunk.metadata.source,
        file: chunk.metadata.file,
        chunk_index: chunk.metadata.chunkIndex,
        embedding: embeddings[j],
      }));

      // 5. Insertar en Supabase
      const { error } = await supabase.from("law_chunks").upsert(rows);

      if (error) {
        console.error(`❌ Error en lote ${i}: ${error.message}`);
      } else {
        uploaded += batch.length;
        console.log(
          `✅ ${uploaded}/${chunks.length} chunks subidos (${Math.round((uploaded / chunks.length) * 100)}%)`
        );
      }
    } catch (err) {
      console.error(`❌ Error en lote ${i}: ${err.message}`);
      // Esperar un poco si hay rate limit
      console.log("   ⏳ Esperando 5 segundos...");
      await new Promise((r) => setTimeout(r, 5000));
      i -= BATCH_SIZE; // Reintentar este lote
    }

    // Pequeña pausa entre lotes para no exceder rate limits
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log(`\n🎉 ¡Listo! ${uploaded} chunks subidos a Supabase.`);
}

main().catch(console.error);
