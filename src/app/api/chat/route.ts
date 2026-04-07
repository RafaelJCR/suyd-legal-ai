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

// Detecta si la pregunta es sobre identidad/creador
// Es agresivo: cualquier mención de "crea", "hizo", "nombre", "eres", etc.
function isIdentityQuestion(text: string): boolean {
  const lower = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // Palabras clave que indican pregunta sobre identidad
  const keywords = [
    "creo", "creas", "creaste", "creador", "creadora", "creacion", "creado",
    "hizo", "hiciste", "hicieron",
    "desarrollo", "desarrollaste", "desarrollador", "desarrollaron",
    "programo", "programaste", "programador", "programaron",
    "diseño", "disenaste", "diseñador",
    "fabrico", "fabricaste",
    "entrenaron", "entrenaste", "entrenamiento",
    "rafael",
    "tu nombre", "como te llamas", "quien eres", "que eres",
    "que modelo", "que ia", "que llm",
    "chatgpt", "gpt-", "llama", "meta ai", "openai", "claude", "gemini", "anthropic",
    "tu creador", "tus creadores"
  ];

  return keywords.some(k => lower.includes(k));
}

// Detecta saludos simples
function isGreeting(text: string): boolean {
  const lower = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  const greetings = ["hola", "buenos dias", "buenas tardes", "buenas noches", "que tal", "saludos"];
  return greetings.some(g => lower === g || lower.startsWith(g + " ") || lower.endsWith(" " + g));
}

// Respuesta fija para identidad (sin pasar por el LLM)
const IDENTITY_RESPONSE = `Soy **SUYD Legal AI**, un asistente legal especializado en las leyes de la República Dominicana.

Fui creado por **Rafael José Cedano Rijo**, fundador de **SUYD**.

Mi base de conocimiento incluye:
- Constitución de la República Dominicana
- Código de Trabajo (Ley 16-92)
- Código Penal (Ley 550-14)

¿En qué consulta legal puedo orientarte hoy?`;

const GREETING_RESPONSE = `¡Hola! Soy **SUYD Legal AI**, tu asistente legal especializado en leyes de República Dominicana.

¿En qué consulta legal puedo ayudarte hoy?`;

// Función para devolver una respuesta fija como stream
function fixedResponse(text: string): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      // Formato del data stream del Vercel AI SDK
      const lines = text.split("");
      let i = 0;
      const interval = setInterval(() => {
        if (i >= lines.length) {
          controller.enqueue(encoder.encode(`d:{"finishReason":"stop","usage":{"promptTokens":0,"completionTokens":0}}\n`));
          controller.close();
          clearInterval(interval);
          return;
        }
        const chunk = lines.slice(i, i + 3).join("");
        i += 3;
        controller.enqueue(encoder.encode(`0:${JSON.stringify(chunk)}\n`));
      }, 10);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "x-vercel-ai-data-stream": "v1",
    },
  });
}

export async function POST(req: Request) {
  const { messages } = await req.json();

  // 1. Obtener el último mensaje del usuario
  const userMessages = messages
    .filter((m: { role: string }) => m.role === "user")
    .map((m: { content: string }) => m.content);

  const lastUserMessage = userMessages[userMessages.length - 1] || "";

  // 2. INTERCEPTAR preguntas de identidad - responder directamente sin LLM
  if (isIdentityQuestion(lastUserMessage)) {
    return fixedResponse(IDENTITY_RESPONSE);
  }

  // 3. INTERCEPTAR saludos simples - responder directamente sin LLM
  if (isGreeting(lastUserMessage)) {
    return fixedResponse(GREETING_RESPONSE);
  }

  // 4. Para consultas legales reales, hacer RAG con contexto
  const searchContext = userMessages.slice(-3).join(". ");
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
  // temperature: 0.3 = más preciso, sigue mejor las instrucciones
  const result = streamText({
    model: groq("llama-3.3-70b-versatile"),
    system: BASE_PROMPT + legalContext,
    messages,
    temperature: 0.3,
  });

  return result.toDataStreamResponse();
}
