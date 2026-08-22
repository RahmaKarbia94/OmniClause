import { PDFParse } from "pdf-parse";

/**
 * Extracts raw text from a file buffer based on its MIME type.
 * Supports application/pdf and text/plain -- the set enforced by
 * middleware/upload.ts's fileFilter, so anything else reaching here
 * indicates a caller bypassing that middleware, not a normal case.
 */
export async function extractText(buffer: Buffer, mimetype: string): Promise<string> {
  if (mimetype === "application/pdf") {
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      return result.text;
    } finally {
      await parser.destroy();
    }
  }
  if (mimetype === "text/plain") {
    return buffer.toString("utf-8");
  }
  throw new Error(`Unsupported mimetype: ${mimetype}`);
}

/**
 * Simplified chunker for this sprint: splits on paragraph boundaries,
 * then greedily packs paragraphs into chunks up to maxTokens
 * *characters* (a rough stand-in for tokens, not a real tokenizer).
 * A paragraph longer than maxTokens on its own is hard-split so no
 * chunk ever silently exceeds the limit.
 *
 * Deliberately isolated here so it can be swapped for a real
 * token-based chunker later without touching callers.
 */
export function chunkText(text: string, maxTokens: number = 1000): string[] {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  if (paragraphs.length === 0) {
    return [];
  }

  const chunks: string[] = [];
  let current = "";

  for (const paragraph of paragraphs) {
    if (paragraph.length > maxTokens) {
      if (current) {
        chunks.push(current);
        current = "";
      }
      for (let i = 0; i < paragraph.length; i += maxTokens) {
        chunks.push(paragraph.slice(i, i + maxTokens));
      }
      continue;
    }

    const candidate = current ? `${current}\n\n${paragraph}` : paragraph;
    if (candidate.length > maxTokens) {
      chunks.push(current);
      current = paragraph;
    } else {
      current = candidate;
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
}
