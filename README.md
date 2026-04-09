# SUYD Legal AI

Asistente legal inteligente basado en **RAG (Retrieval-Augmented Generation)** que brinda orientacion juridica fundamentada en las leyes de la Republica Dominicana.

El sistema procesa y analiza documentos legales reales, busca los articulos mas relevantes a cada consulta y genera respuestas precisas con citas a la legislacion vigente.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Groq](https://img.shields.io/badge/Groq-Llama_3.3_70B-orange)
![Supabase](https://img.shields.io/badge/Supabase-pgvector-3FCF8E?logo=supabase&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)

---

## Que hace

Un usuario escribe una pregunta legal en lenguaje natural y el sistema:

1. Convierte la consulta en un vector semantico (HuggingFace)
2. Busca los fragmentos juridicos mas relevantes en Supabase (pgvector)
3. Envia el contexto legal + la pregunta al LLM (Groq / Llama 3.3 70B)
4. Devuelve una respuesta fundamentada con citas a articulos especificos

Solo cita articulos que existen en los documentos recuperados. Nunca inventa referencias.

---

## Temas legales cubiertos

- Derecho laboral (despidos, prestaciones, contratos)
- Vivienda y alquiler (Decreto 4807 de Inquilinato)
- Derecho penal y procesal penal
- Derecho de familia (pension alimenticia, custodia)
- Proteccion al consumidor (Ley 358-05)
- Derechos constitucionales
- Proteccion de ninos y adolescentes (Ley 136-03)
- Violencia intrafamiliar (Ley 24-97)

---

## Arquitectura

```
Usuario
  |
  v
Next.js Frontend (React 19 + Tailwind CSS)
  |
  v
API Route (/api/chat)
  |
  +---> HuggingFace API (embeddings: all-MiniLM-L6-v2)
  |         |
  |         v
  |     Supabase pgvector (busqueda semantica, top 8 chunks, >40% similitud)
  |         |
  |         v
  +---> Groq API (Llama 3.3 70B, temp: 0.3)
  |
  v
Respuesta en streaming al usuario
```

---

## Base de conocimiento legal

10 documentos juridicos dominicanos: codigos, leyes, decretos y la Constitucion.

| Documento | Fragmentos |
|-----------|-----------|
| Codigo Civil | 976 |
| Codigo de Trabajo | 1,445 |
| Codigo Penal | 326 |
| Codigo de Procedimiento Civil | 611 |
| Codigo Procesal Penal | 359 |
| Constitucion de la RD | 299 |
| Decreto 4807 (Inquilinato) | 35 |
| Ley 136-03 (Ninos y Adolescentes) | 518 |
| Ley 24-97 (Violencia Intrafamiliar) | 69 |
| Ley 358-05 (Proteccion al Consumidor) | 170 |
| **Total** | **4,808 fragmentos** |

---

## Stack tecnologico

| Capa | Tecnologia |
|------|-----------|
| Frontend | React 19, Next.js 16 (App Router), Tailwind CSS 4 |
| LLM | Groq (Llama 3.3 70B Versatile) |
| Embeddings | HuggingFace (sentence-transformers/all-MiniLM-L6-v2) |
| Base de datos vectorial | Supabase con pgvector |
| Monitoreo | Helicone (proxy para tracking de costos y latencia) |
| Procesamiento de PDFs | pdfjs-dist |
| Streaming | Vercel AI SDK |

---

## Instalacion local

```bash
# Clonar el repositorio
git clone https://github.com/RafaelJCR/suyd-legal-ai.git
cd suyd-legal-ai

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env.local
```

Variables de entorno necesarias:

```env
GROQ_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=
HUGGINGFACE_API_KEY=
HELICONE_API_KEY=
```

```bash
# Procesar PDFs legales (genera chunks)
node scripts/process-laws.mjs

# Subir chunks con embeddings a Supabase
node scripts/upload-to-supabase.mjs

# Iniciar el servidor de desarrollo
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000)

---

## Pipeline de datos

```
PDFs en /data/laws/
       |
       v
process-laws.mjs (extraccion + chunking ~1000 chars, overlap 200)
       |
       v
/data/chunks.json (4,808 fragmentos)
       |
       v
upload-to-supabase.mjs (embeddings + upload en batches de 20)
       |
       v
Supabase pgvector (tabla law_chunks)
```

---

## Autor

**Rafael Jose Cedano Rijo** — Fundador de SUYD

[![LinkedIn](https://img.shields.io/badge/LinkedIn-rafaelcedanorijo-0A66C2?logo=linkedin&logoColor=white)](https://www.linkedin.com/in/rafaelcedanorijo/)
[![GitHub](https://img.shields.io/badge/GitHub-RafaelJCR-181717?logo=github&logoColor=white)](https://github.com/RafaelJCR)

---

> **Aviso:** Este asistente proporciona orientacion general y no sustituye la asesoria de un abogado licenciado.
