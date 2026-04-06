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

  // 2. Buscar en Supabase los 8 chunks más parecidos
  const { data, error } = await supabase.rpc("search_law_chunks", {
    query_embedding: embedding,
    match_count: 8,
  });

  if (error) {
    console.error("Error buscando leyes:", error);
    return [];
  }

  // 3. Filtrar: solo quedarnos con chunks que tengan más de 40% de similitud
  //    Esto evita traer artículos random que no tienen nada que ver
  return (data || []).filter((chunk: { similarity: number }) => chunk.similarity > 0.4);
}

// Las instrucciones base para el LLM
const BASE_PROMPT = `Eres un asistente legal experto en las leyes de la República Dominicana.
Actúas como un abogado y jurista altamente capacitado.

REGLAS ESTRICTAS:
- Se te proporcionarán fragmentos reales de leyes dominicanas relevantes a la pregunta.
- SOLO cita artículos que aparezcan en los fragmentos proporcionados.
- NUNCA inventes o cites artículos que no estén en los fragmentos.
- Si los fragmentos no cubren la pregunta, responde con tu conocimiento general pero aclara que no encontraste la ley específica en tu base de datos.
- NO cites artículos del Código de Trabajo para casos que no sean laborales.
- NO cites artículos del Código Penal para casos civiles, a menos que haya un delito involucrado.

Tu comportamiento:
- Respondes en español de forma clara y directa
- Cuando uses términos legales, los explicas brevemente
- Aclaras que eres un asistente de IA y que tu orientación no sustituye un abogado licenciado

Formato de respuesta:
- Sé conciso y directo, no repitas información
- Usa encabezados y listas cortas
- Cita solo los artículos relevantes de los fragmentos
- Sugiere pasos concretos al final
- Si el caso es grave, recomienda un abogado presencial`;

export async function POST(req: Request) {
  const { messages } = await req.json();

  // 1. Construir un resumen de TODA la conversación para buscar mejor
  //    ANTES: solo buscaba con el último mensaje ("como las consigo?")
  //    AHORA: busca con el contexto completo ("bocinas + policía + campo + música alta")
  const userMessages = messages
    .filter((m: { role: string }) => m.role === "user")
    .map((m: { content: string }) => m.content);

  // Tomamos los últimos 3 mensajes del usuario para tener contexto
  // sin exceder el límite del modelo de embeddings
  const searchContext = userMessages.slice(-3).join(". ");

  // 2. Buscar leyes relevantes usando el contexto completo
  const relevantLaws = await searchLaws(searchContext);

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
