// Splits a markdown document into passages for the vector database.
// Relative imports only: this file is also run by scripts/ingest.ts (via tsx).

export type Chunk = {
  source: string;
  title: string;
  heading: string;
  chunkIndex: number;
  content: string; // what we embed AND show to the model: "Title - Heading" + the passage
};

const MAX_CHARS = 900;

/** Group paragraphs (or list lines) into pieces that are at most MAX_CHARS long. */
function packParagraphs(body: string): string[] {
  const paragraphs = body
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const pieces: string[] = [];
  let current = "";
  for (const p of paragraphs) {
    // A very long paragraph is split on line breaks / sentence ends.
    const parts =
      p.length > MAX_CHARS ? p.split(/(?<=\.)\s+|\n/).filter(Boolean) : [p];
    for (const part of parts) {
      if (current && current.length + part.length + 2 > MAX_CHARS) {
        pieces.push(current);
        current = "";
      }
      current = current ? `${current}\n\n${part}` : part;
    }
  }
  if (current) pieces.push(current);
  return pieces;
}

export function chunkMarkdown(source: string, markdown: string): Chunk[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const title = lines.find((l) => l.startsWith("# "))?.slice(2).trim() ?? source;

  // Walk the file, starting a new section at every "## " heading.
  const sections: { heading: string; body: string[] }[] = [{ heading: "Overview", body: [] }];
  for (const line of lines) {
    if (line.startsWith("# ")) continue;
    if (line.startsWith("## ")) {
      sections.push({ heading: line.slice(3).trim(), body: [] });
    } else {
      sections[sections.length - 1].body.push(line);
    }
  }

  const chunks: Chunk[] = [];
  for (const section of sections) {
    const body = section.body.join("\n").trim();
    if (!body) continue;
    for (const piece of packParagraphs(body)) {
      chunks.push({
        source,
        title,
        heading: section.heading,
        chunkIndex: chunks.length,
        content: `${title} - ${section.heading}\n${piece}`,
      });
    }
  }
  return chunks;
}
