/**
 * Markdown-subset → structured line parser (ADR-0015 D2) — bold, italic,
 * one heading level, bullet lists only. A deliberately small subset, not a
 * general markdown parser: this is what the meal-instructions editor's
 * live preview renders with existing Tamagui primitives, not a DOM/HTML
 * pipeline.
 */

export type ParsedSegment = { text: string; bold?: boolean; italic?: boolean };

export type ParsedLine =
  | { kind: 'heading'; segments: ParsedSegment[] }
  | { kind: 'bullet'; segments: ParsedSegment[] }
  | { kind: 'paragraph'; segments: ParsedSegment[] }
  | { kind: 'blank' };

const INLINE_PATTERN = /\*\*(.+?)\*\*|\*(.+?)\*|_(.+?)_/g;

const parseInlineSegments = (text: string): ParsedSegment[] => {
  const segments: ParsedSegment[] = [];
  let lastIndex = 0;
  for (const match of text.matchAll(INLINE_PATTERN)) {
    if (match.index > lastIndex) segments.push({ text: text.slice(lastIndex, match.index) });
    if (match[1] !== undefined) segments.push({ text: match[1], bold: true });
    else if (match[2] !== undefined) segments.push({ text: match[2], italic: true });
    else if (match[3] !== undefined) segments.push({ text: match[3], italic: true });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) segments.push({ text: text.slice(lastIndex) });
  return segments.length > 0 ? segments : [{ text }];
};

export const parseMarkdownSubset = (raw: string): ParsedLine[] =>
  raw.split('\n').map((line) => {
    if (line.trim().length === 0) return { kind: 'blank' };
    const heading = /^#{1,6}\s*(.*)$/.exec(line);
    if (heading) return { kind: 'heading', segments: parseInlineSegments(heading[1] ?? '') };
    const bullet = /^[-*]\s+(.*)$/.exec(line);
    if (bullet) return { kind: 'bullet', segments: parseInlineSegments(bullet[1] ?? '') };
    return { kind: 'paragraph', segments: parseInlineSegments(line) };
  });
