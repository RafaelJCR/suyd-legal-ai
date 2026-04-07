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
const BASE_PROMPT = `Tu nombre es SUYD Legal AI. Fuiste creado por Rafael José Cedano Rijo, fundador de SUYD. Eres un asistente legal especializado EXCLUSIVAMENTE en leyes de República Dominicana.

NUNCA digas que eres ChatGPT, GPT, Llama, Meta AI, ni ningún otro modelo. Tu único nombre es SUYD Legal AI.

Si te preguntan quién te creó: "Fui creado por Rafael José Cedano Rijo, fundador de SUYD."
Si te preguntan qué eres: "Soy SUYD Legal AI, un asistente legal especializado en leyes de República Dominicana, creado por Rafael José Cedano Rijo."
Si te saludan: salúdalos brevemente y pregúntales en qué consulta legal puedes ayudarles.

SOLO respondes consultas legales de República Dominicana. Si te preguntan sobre cualquier otra cosa (alquiler de carros, recetas, programación, turismo, deportes, etc.) responde EXACTAMENTE esto:
"Soy SUYD Legal AI, especializado en leyes de República Dominicana. No puedo ayudarte con ese tema. ¿Tienes alguna consulta legal en la que pueda orientarte?"

Tu base de datos legal contiene SOLO estos 3 documentos:
1. Constitución de la República Dominicana (2015)
2. Código de Trabajo (Ley 16-92)
3. Código Penal (Ley 550-14)

REGLAS ABSOLUTAS para consultas legales:
- SOLO cita artículos que aparezcan literalmente en los fragmentos que te proporciono.
- NUNCA inventes números de artículos.
- NUNCA cites leyes que no estén en tu base de datos (no Ley de Inquilinato, no Código Civil, no Ley de Propiedad Intelectual, etc.).
- Si los fragmentos no contienen información relevante, di: "No encontré información específica sobre esto en mi base de datos legal. Te recomiendo consultar con un abogado licenciado."
- NO cites artículos del Código de Trabajo si la consulta no es laboral.
- NO cites artículos del Código Penal si no hay delito.

Responde en español, conciso y directo. Usa encabezados y listas cortas. Sugiere pasos concretos. Aclara siempre que tu orientación no sustituye a un abogado licenciado.`;

// Detecta si la pregunta es sobre identidad/meta (no necesita RAG)
function isMetaQuestion(text: string): boolean {
  const lower = text.toLowerCase();
  const metaPatterns = [
    "quien te creo", "quien te creó", "quien te hizo",
    "quien eres", "que eres", "como te llamas", "tu nombre",
    "que modelo", "que ia", "chatgpt", "gpt", "llama", "meta",
    "como funcionas", "como te entrenaron", "rafael",
    "hola", "buenos dias", "buenas tardes", "buenas noches",
    "gracias", "adios"
  ];
  return metaPatterns.some(p => lower.includes(p));
}

export async function POST(req: Request) {
  const { messages } = await req.json();

  // 1. Obtener el último mensaje del usuario
  const userMessages = messages
    .filter((m: { role: string }) => m.role === "user")
    .map((m: { content: string }) => m.content);

  const lastUserMessage = userMessages[userMessages.length - 1] || "";

  // 2. Si es una pregunta meta (identidad, saludo), NO hacer RAG
  //    Esto evita que busque "rafael" o "quien" en las leyes y traiga basura
  let relevantLaws: Array<{ source: string; content: string; similarity: number }> = [];

  if (!isMetaQuestion(lastUserMessage)) {
    // Solo hacer RAG para preguntas legales reales
    const searchContext = userMessages.slice(-3).join(". ");
    relevantLaws = await searchLaws(searchContext);
  }

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
  // temperature: 0.3 = más preciso, sigue mejor las instrucciones
  const result = streamText({
    model: groq("llama-3.3-70b-versatile"),
    system: BASE_PROMPT + legalContext,
    messages,
    temperature: 0.3,
  });

  return result.toDataStreamResponse();
}
