// =============================================================
// SCRIPT: process-laws.mjs
// =============================================================
// 1. Lee los PDFs de las leyes dominicanas
// 2. Extrae el texto página por página
// 3. Lo divide en chunks (pedazos)
// 4. Guarda todo en un archivo JSON
// =============================================================

import fs from "fs";
import path from "path";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.js");

const LAWS_DIR = path.join(process.cwd(), "data", "laws");
const OUTPUT_FILE = path.join(process.cwd(), "data", "chunks.json");

// Extrae todo el texto de un PDF, página por página
async function extractTextFromPdf(filePath) {
  const data = new Uint8Array(fs.readFileSync(filePath));
  const doc = await pdfjsLib.getDocument({ data }).promise;
  let fullText = "";

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map((item) => item.str).join(" ");
    fullText += pageText + "\n";
  }

  return { text: fullText, numPages: doc.numPages };
}

// Divide texto en chunks de ~1000 caracteres con overlap de 200
function splitIntoChunks(text, chunkSize = 1000, overlap = 200) {
  const chunks = [];
  let start = 0;

  while (start < text.length) {
    let end = start + chunkSize;
    if (end < text.length) {
      const lastPeriod = text.lastIndexOf(".", end);
      const lastNewline = text.lastIndexOf("\n", end);
      const bestBreak = Math.max(lastPeriod, lastNewline);
      if (bestBreak > start + chunkSize / 2) {
        end = bestBreak + 1;
      }
    }
    const chunk = text.slice(start, end).trim();
    if (chunk.length > 50) {
      chunks.push(chunk);
    }
    start = end - overlap;
  }

  return chunks;
}

async function main() {
  console.log("📚 Procesando leyes dominicanas...\n");

  const allChunks = [];
  const pdfFiles = fs.readdirSync(LAWS_DIR).filter((f) => f.endsWith(".pdf"));

  for (const file of pdfFiles) {
    const filePath = path.join(LAWS_DIR, file);
    console.log(`📄 Leyendo: ${file}`);

    const { text, numPages } = await extractTextFromPdf(filePath);
    console.log(`   → ${numPages} páginas, ${text.length} caracteres`);

    const cleanText = text
      .replace(/\r\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/\s{2,}/g, " ")
      .trim();

    const chunks = splitIntoChunks(cleanText);
    console.log(`   → ${chunks.length} chunks generados\n`);

    const lawName = file
      .replace(".pdf", "")
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());

    for (let i = 0; i < chunks.length; i++) {
      allChunks.push({
        id: `${file}-${i}`,
        content: chunks[i],
        metadata: {
          source: lawName,
          file: file,
          chunkIndex: i,
          totalChunks: chunks.length,
        },
      });
    }
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allChunks, null, 2));

  console.log("✅ Procesamiento completado!");
  console.log(`   → Total chunks: ${allChunks.length}`);
  console.log(`   → Guardado en: ${OUTPUT_FILE}`);
}

main().catch(console.error);
