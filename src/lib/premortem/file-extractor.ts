// File extraction for PRE-MORTEM IA.
//
// Extracts text content from uploaded project files so the LLM can analyze
// the actual project (code, documents, spreadsheets, etc.) rather than only
// the user's free-text description.
//
// Supported formats:
//   - Text/code: .txt .md .json .csv .yaml .yml .xml .html .css .js .ts .tsx
//     .jsx .py .go .rs .java .c .cpp .h .rb .php .sh .sql .toml .ini .env
//     .config .gitignore .dockerfile .tf
//   - PDF: .pdf (via pdf-parse)
//   - DOCX: .docx (via mammoth)
//   - Spreadsheets: .xlsx .xls .csv (via xlsx)
//   - Archives: .zip (via jszip, recursive)
//   - Images: .png .jpg .jpeg .gif .webp .svg (noted, not OCR'd)
//   - Other: noted as "no procesable"

import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import * as XLSX from "xlsx";
import JSZip from "jszip";
import { formatSize } from "./format";

export interface ExtractedFile {
  name: string;          // relative path (incl. subdirs inside zip)
  category: FileCategory;
  extension: string;
  sizeBytes: number;
  status: ExtractStatus;
  text?: string;         // extracted text (may be truncated)
  note?: string;         // human-readable note (e.g. reason for skip)
  truncated?: boolean;
}

export type FileCategory =
  | "texto"
  | "documento"
  | "hoja_calculo"
  | "presentacion"
  | "pdf"
  | "imagen"
  | "archivo"
  | "codigo"
  | "otro";

export type ExtractStatus = "ok" | "vacio" | "no_procesable" | "demasiado_grande" | "error";

const TEXT_EXTENSIONS = new Set([
  "txt", "md", "markdown", "rst", "json", "csv", "tsv", "yaml", "yml", "xml",
  "html", "htm", "css", "scss", "sass", "less", "js", "mjs", "cjs", "ts",
  "tsx", "jsx", "py", "go", "rs", "java", "c", "cpp", "cc", "h", "hpp", "rb",
  "php", "sh", "bash", "zsh", "sql", "toml", "ini", "cfg", "conf", "env",
  "gitignore", "dockerignore", "dockerfile", "tf", "hcl", "gradle", "kt",
  "swift", "lua", "r", "dart", "vue", "svelte", "graphql", "gql", "log",
]);

const CODE_EXTENSIONS = new Set([
  "js", "mjs", "cjs", "ts", "tsx", "jsx", "py", "go", "rs", "java", "c", "cpp",
  "cc", "h", "hpp", "rb", "php", "sh", "bash", "sql", "tf", "hcl", "kt",
  "swift", "lua", "r", "dart", "vue", "svelte", "graphql", "gql",
]);

const IMAGE_EXTENSIONS = new Set([
  "png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "ico", "tiff", "tif",
]);

const MAX_PER_FILE_CHARS = 4000;
const MAX_TOTAL_CHARS = 24000;
const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20 MB per single file
const MAX_TOTAL_BYTES = 80 * 1024 * 1024; // 80 MB total upload

function extOf(name: string): string {
  // Sanitize: strip path separators and null bytes that could come from
  // crafted zip entries (zip-slip / path traversal protection #17).
  const safe = name.replace(/[\x00-\x1f]/g, "").replace(/[\\]/g, "/");
  const base = safe.split("/").pop() ?? safe;
  const lower = base.toLowerCase();
  // handle dotfiles like .gitignore / Dockerfile (no ext)
  if (lower.startsWith(".") && !lower.slice(1).includes(".")) {
    return lower.slice(1);
  }
  const parts = lower.split(".");
  if (parts.length < 2) {
    return lower; // e.g. "dockerfile"
  }
  return parts[parts.length - 1];
}

/** Reject obviously dangerous binary/executable types that should never be processed. */
const BLOCKED_EXTENSIONS = new Set([
  "exe",
  "bat",
  "cmd",
  "msi",
  "dmg",
  "apk",
  "jar",
  "class",
  "dll",
  "so",
  "dylib",
]);

function categorize(ext: string): FileCategory {
  if (CODE_EXTENSIONS.has(ext)) return "codigo";
  if (IMAGE_EXTENSIONS.has(ext)) return "imagen";
  if (ext === "pdf") return "pdf";
  if (ext === "docx" || ext === "doc") return "documento";
  if (ext === "pptx" || ext === "ppt") return "presentacion";
  if (ext === "xlsx" || ext === "xls" || ext === "csv" || ext === "ods") return "hoja_calculo";
  if (ext === "zip") return "archivo";
  if (TEXT_EXTENSIONS.has(ext)) return "texto";
  return "otro";
}

function truncate(text: string, limit: number): { text: string; truncated: boolean } {
  if (text.length <= limit) return { text, truncated: false };
  return {
    text: text.slice(0, limit) + "\n…[truncado]",
    truncated: true,
  };
}

async function extractTextFile(bytes: Uint8Array): Promise<string> {
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

async function extractPdf(bytes: Uint8Array): Promise<string> {
  const parser = new PDFParse({ data: bytes });
  const result = await parser.getText();
  return result?.text ?? "";
}

async function extractDocx(bytes: Uint8Array): Promise<string> {
  const buf = Buffer.from(bytes);
  const result = await mammoth.extractRawText({ buffer: buf });
  return result?.value ?? "";
}

function extractSpreadsheet(bytes: Uint8Array, ext: string): string {
  const buf = Buffer.from(bytes);
  const wb = XLSX.read(buf, { type: "buffer" });
  const out: string[] = [];
  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    if (!sheet) continue;
    const csv = XLSX.utils.sheet_to_csv(sheet, { FS: ",", RS: "\n", blankrows: false });
    out.push(`### Hoja: ${sheetName}`);
    out.push(csv);
    out.push("");
  }
  return out.join("\n");
}

async function extractZip(
  bytes: Uint8Array,
  basePath: string
): Promise<ExtractedFile[]> {
  const zip = await JSZip.loadAsync(Buffer.from(bytes));
  const results: ExtractedFile[] = [];
  const entries = Object.values(zip.files);
  for (const entry of entries) {
    if (entry.dir) continue;
    const innerPath = basePath ? `${basePath}/${entry.name}` : entry.name;
    // skip very large inner files
    const innerBytes = await entry.async("uint8array");
    if (innerBytes.byteLength > MAX_FILE_BYTES) {
      results.push({
        name: innerPath,
        category: "otro",
        extension: extOf(entry.name),
        sizeBytes: innerBytes.byteLength,
        status: "demasiado_grande",
        note: `Archivo dentro del zip demasiado grande (${(innerBytes.byteLength / 1024 / 1024).toFixed(1)} MB).`,
      });
      continue;
    }
    const inner = await processSingle(innerPath, innerBytes);
    results.push(inner);
  }
  return results;
}

async function processSingle(
  name: string,
  bytes: Uint8Array
): Promise<ExtractedFile> {
  const ext = extOf(name);
  const category = categorize(ext);
  const sizeBytes = bytes.byteLength;

  if (sizeBytes === 0) {
    return { name, category, extension: ext, sizeBytes, status: "vacio", note: "Archivo vacío." };
  }
  if (sizeBytes > MAX_FILE_BYTES) {
    return {
      name,
      category,
      extension: ext,
      sizeBytes,
      status: "demasiado_grande",
      note: `Archivo demasiado grande (${(sizeBytes / 1024 / 1024).toFixed(1)} MB). Se omite la extracción.`,
    };
  }
  // Block dangerous binary/executable types (#17).
  if (BLOCKED_EXTENSIONS.has(ext)) {
    return {
      name,
      category,
      extension: ext,
      sizeBytes,
      status: "no_procesable",
      note: `Tipo de archivo no permitido (.${ext}). No se procesan ejecutables ni binarios.`,
    };
  }

  try {
    let text = "";
    let note: string | undefined;
    if (ext === "zip") {
      // handled by caller for recursion; if reached here, treat as archive container
      const inner = await extractZip(bytes, name);
      // flatten: return a synthetic summary
      const nestedText = inner
        .map(
          (f) =>
            `  - ${f.name} (${f.category}, ${formatSize(f.sizeBytes)})${
              f.status === "ok" && f.text ? `: ${f.text.slice(0, 120).replace(/\s+/g, " ")}` : ""
            }`
        )
        .join("\n");
      text = `Archivo zip con ${inner.length} archivos:\n${nestedText}`;
      note = `Zip descomprimido en ${inner.length} archivos.`;
    } else if (category === "texto" || category === "codigo") {
      text = await extractTextFile(bytes);
    } else if (category === "pdf") {
      text = await extractPdf(bytes);
    } else if (ext === "docx") {
      text = await extractDocx(bytes);
    } else if (ext === "doc") {
      note = "DOC antiguo (.doc) no soportado por el extractor. Conviértelo a .docx o .pdf.";
    } else if (category === "hoja_calculo") {
      text = extractSpreadsheet(bytes, ext);
    } else if (category === "imagen") {
      note = `Imagen (${ext.toUpperCase()}). El sistema de extracción no analiza el contenido visual; el nombre del archivo es la única evidencia disponible.`;
    } else if (ext === "pptx" || ext === "ppt") {
      note = "Presentación. Extracción de presentaciones no implementada en esta versión.";
    } else {
      note = `Tipo de archivo no procesable (${ext || "sin extensión"}).`;
    }

    if (!text && note) {
      return { name, category, extension: ext, sizeBytes, status: "no_procesable", note };
    }
    const trimmed = (text || "").trim();
    if (!trimmed) {
      return {
        name,
        category,
        extension: ext,
        sizeBytes,
        status: "vacio",
        note: "No se extrajo texto (posible archivo binario o escaneado sin OCR).",
      };
    }
    const { text: truncatedText, truncated } = truncate(trimmed, MAX_PER_FILE_CHARS);
    return {
      name,
      category,
      extension: ext,
      sizeBytes,
      status: "ok",
      text: truncatedText,
      truncated,
      note,
    };
  } catch (err) {
    return {
      name,
      category,
      extension: ext,
      sizeBytes,
      status: "error",
      note: err instanceof Error ? err.message : "Error desconocido al procesar el archivo.",
    };
  }
}

// formatSize is re-exported from ./format for backwards compatibility.
export { formatSize } from "./format";

export interface ExtractionResult {
  files: ExtractedFile[];
  contextBlock: string;     // markdown block to append to the analysis prompt
  totalFiles: number;
  okFiles: number;
  totalChars: number;
  truncated: boolean;        // whether the total exceeded the cap
}

/**
 * Process an uploaded set of files (name + bytes) and produce a combined
 * markdown context block suitable for the LLM pre-mortem analysis.
 */
export async function extractProjectFiles(
  files: { name: string; bytes: Uint8Array }[]
): Promise<ExtractionResult> {
  const out: ExtractedFile[] = [];
  let totalBytes = 0;

  for (const f of files) {
    if (totalBytes + f.bytes.byteLength > MAX_TOTAL_BYTES) {
      out.push({
        name: f.name,
        category: categorize(extOf(f.name)),
        extension: extOf(f.name),
        sizeBytes: f.bytes.byteLength,
        status: "demasiado_grande",
        note: "Límite total de carga excedido. Se omite este archivo.",
      });
      continue;
    }
    totalBytes += f.bytes.byteLength;

    // zip: recurse
    if (extOf(f.name) === "zip") {
      try {
        const inner = await extractZip(f.bytes, f.name);
        // summarize zip into one entry
        const okInner = inner.filter((x) => x.status === "ok");
        const parts: string[] = [];
        parts.push(`Archivo ZIP con ${inner.length} archivos (${okInner.length} procesados).`);
        for (const i of inner.slice(0, 60)) {
          parts.push(`  - ${i.name} [${i.category}] ${i.status}${i.text ? `: ${i.text.slice(0, 200).replace(/\s+/g, " ")}` : i.note ? ` — ${i.note}` : ""}`);
        }
        if (inner.length > 60) parts.push(`  …y ${inner.length - 60} más.`);
        const { text, truncated } = truncate(parts.join("\n"), MAX_PER_FILE_CHARS * 2);
        out.push({
          name: f.name,
          category: "archivo",
          extension: "zip",
          sizeBytes: f.bytes.byteLength,
          status: "ok",
          text,
          truncated,
          note: `Zip descomprimido (${inner.length} archivos).`,
        });
      } catch (err) {
        out.push({
          name: f.name,
          category: "archivo",
          extension: "zip",
          sizeBytes: f.bytes.byteLength,
          status: "error",
          note: err instanceof Error ? err.message : "Error al descomprimir el zip.",
        });
      }
      continue;
    }

    out.push(await processSingle(f.name, f.bytes));
  }

  // Build the combined context block, respecting the total char cap.
  const blocks: string[] = [];
  let used = 0;
  let truncatedFlag = false;
  for (const f of out) {
    const header = `### ${f.name} — ${categoryLabel(f.category)} · ${formatSize(f.sizeBytes)}`;
    if (f.status === "ok" && f.text) {
      const remaining = MAX_TOTAL_CHARS - used;
      if (remaining <= 0) {
        truncatedFlag = true;
        continue;
      }
      let text = f.text;
      if (text.length > remaining) {
        text = text.slice(0, remaining) + "\n…[truncado por límite total]";
        truncatedFlag = true;
      }
      blocks.push(`${header}\n\n\`\`\`\n${text}\n\`\`\`${f.truncated ? "\n_(extracto individual truncado)_" : ""}`);
      used += text.length;
    } else {
      const note = f.note ?? statusNote(f.status);
      blocks.push(`${header}\n\n_${note}_`);
    }
  }

  const okCount = out.filter((x) => x.status === "ok").length;
  const contextBlock =
    out.length === 0
      ? ""
      : `## ARCHIVOS DEL PROYECTO SUBIDO\n\nSe extrajo el siguiente contenido de ${out.length} archivo(s) (${okCount} procesados correctamente). Úsalo como **evidencia** para el análisis. Cuando un archivo no pudo procesarse, se indica la razón. No inventes contenido que no esté en los archivos.\n\n${blocks.join("\n\n---\n\n")}${truncatedFlag ? "\n\n⚠️ El contenido total excedió el límite; algunos archivos fueron truncados." : ""}`;

  return {
    files: out,
    contextBlock,
    totalFiles: out.length,
    okFiles: okCount,
    totalChars: used,
    truncated: truncatedFlag,
  };
}

function categoryLabel(c: FileCategory): string {
  switch (c) {
    case "texto": return "Texto";
    case "documento": return "Documento";
    case "hoja_calculo": return "Hoja de cálculo";
    case "presentacion": return "Presentación";
    case "pdf": return "PDF";
    case "imagen": return "Imagen";
    case "archivo": return "Archivo";
    case "codigo": return "Código";
    case "otro": return "Otro";
  }
}

function statusNote(s: ExtractStatus): string {
  switch (s) {
    case "ok": return "";
    case "vacio": return "Archivo vacío o sin texto extraíble.";
    case "no_procesable": return "Tipo de archivo no procesable en esta versión.";
    case "demasiado_grande": return "Archivo demasiado grande; se omitió la extracción.";
    case "error": return "Error al procesar el archivo.";
  }
}

export const FILE_LIMITS = {
  maxFileBytes: MAX_FILE_BYTES,
  maxTotalBytes: MAX_TOTAL_BYTES,
  maxPerFileChars: MAX_PER_FILE_CHARS,
  maxTotalChars: MAX_TOTAL_CHARS,
};
