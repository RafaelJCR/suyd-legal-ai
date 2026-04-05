// =============================================================
// ARCHIVO: route.ts (La "cocina" del restaurante) - CON RAG
// =============================================================
// ANTES: Recibía pregunta → LLM respondía de memoria
// AHORA: Recibía pregunta → Busca leyes en Supabase → LLM responde con leyes reales
// =============================================================

import { createGroq } from "@ai-sdk/groq";
import { streamText } from "ai";
import { createClient } from "@supabase/supabase-js";

// --- Groq con Helicone ---
// Las llamadas al LLM pasan por Helicone (proxy) que registra todo:
// costos, velocidad, errores, cantidad de requests
// Es como poner un contador de agua entre la tubería y tu casa
const groq = createGroq({
  baseURL: "https://groq.helicone.ai/openai/v1",
  headers: {
    "Helicone-Auth": `Bearer ${process.env.HELICONE_API_KEY}`,
  },
});

// --- Conexión a Supabase ---
// Aquí es donde están guardados los 2,070 chunks de leyes con sus embeddings
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// --- Función para generar embeddings ---
// Convierte la pregunta del usuario en números (vector)
// para poder buscar chunks de leyes con significado parecido
async function getEmbedding(text: string): Promise<number[]> {
  const response = await fetch(
    "https://router.huggingface.co/hf-inference/models/sentence-transformers/all-MiniLM-L6-v2/pipeline/feature-extraction",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inputs: text }),
    }
  );
  return response.json();
}

// --- Función para buscar leyes relevantes ---
// Recibe la pregunta, la convierte en vector, y busca los chunks más parecidos
async function searchLaws(query: string) {
  // 1. Convertir la pregunta en un vector
  const embedding = await getEmbedding(query);

  // 2. Buscar en Supabase los 5 chunks más parecidos
  const { data, error } = await supabase.rpc("search_law_chunks", {
    query_embedding: embedding,
    match_count: 5,
  });

  if (error) {
    console.error("Error buscando leyes:", error);
    return [];
  }

  return data || [];
}

// Las instrucciones base para el LLM
const BASE_PROMPT = `Eres un asistente legal experto en las leyes de la República Dominicana.
Actúas como un abogado y jurista altamente capacitado.

IMPORTANTE: Se te proporcionarán fragmentos reales de leyes dominicanas relevantes a la pregunta.
DEBES basar tu respuesta en estos fragmentos. Cita el texto exacto cuando sea posible.

Tu comportamiento:
- Respondes en español de forma clara y accesible
- Cuando uses términos legales, los explicas brevemente
- SIEMPRE citas la ley y artículo específico basándote en los fragmentos proporcionados
- Si los fragmentos no cubren la pregunta, dilo honestamente
- Aclaras que eres un asistente de IA y que tu orientación no sustituye un abogado licenciado
- Preguntas detalles adicionales cuando la situación lo requiera

Formato de respuesta:
- Usa encabezados y listas para organizar la información
- Cita textualmente los artículos relevantes de los fragmentos
- Al final, sugiere los pasos concretos que la persona puede tomar
- Si el caso es grave o complejo, recomienda buscar un abogado presencial`;

export async function POST(req: Request) {
  const { messages } = await req.json();

  // 1. Obtener la última pregunta del usuario
  const lastMessage = messages[messages.length - 1];
  const userQuery = lastMessage.content;

  // 2. Buscar leyes relevantes en Supabase (RAG)
  const relevantLaws = await searchLaws(userQuery);

  // 3. Construir el contexto con las leyes encontradas
  let legalContext = "";
  if (relevantLaws.length > 0) {
    legalContext = "\n\n--- FRAGMENTOS DE LEYES DOMINICANAS RELEVANTES ---\n";
    for (const law of relevantLaws) {
      legalContext += `\n[Fuente: ${law.source}] (Similitud: ${(law.similarity * 100).toFixed(1)}%)\n`;
      legalContext += `${law.content}\n`;
      legalContext += "---\n";
    }
    legalContext += "\n--- FIN DE FRAGMENTOS ---\n";
    legalContext += "\nBasa tu respuesta en los fragmentos anteriores. Cita el texto exacto cuando sea relevante.";
  }

  // 4. Enviar al LLM con el contexto de leyes reales
  const result = streamText({
    model: groq("llama-3.3-70b-versatile"),
    system: BASE_PROMPT + legalContext,
    messages,
  });

  return result.toDataStreamResponse();
}
