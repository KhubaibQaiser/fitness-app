import { describe, expect, it } from 'vitest';
import { parseMarkdownSubset } from './markdown-subset';

describe('parseMarkdownSubset', () => {
  it('recognizes a heading line', () => {
    expect(parseMarkdownSubset('# Breakfast style')).toEqual([
      { kind: 'heading', segments: [{ text: 'Breakfast style' }] },
    ]);
  });

  it('recognizes a bullet line with either marker', () => {
    expect(parseMarkdownSubset('- Keep prep short\n* No dairy')).toEqual([
      { kind: 'bullet', segments: [{ text: 'Keep prep short' }] },
      { kind: 'bullet', segments: [{ text: 'No dairy' }] },
    ]);
  });

  it('parses bold and italic inline segments within a paragraph', () => {
    expect(parseMarkdownSubset('Prefer **high-protein** and _lean_ options')).toEqual([
      {
        kind: 'paragraph',
        segments: [
          { text: 'Prefer ' },
          { text: 'high-protein', bold: true },
          { text: ' and ' },
          { text: 'lean', italic: true },
          { text: ' options' },
        ],
      },
    ]);
  });

  it('treats a blank line as its own node rather than an empty paragraph', () => {
    expect(parseMarkdownSubset('First\n\nSecond')).toEqual([
      { kind: 'paragraph', segments: [{ text: 'First' }] },
      { kind: 'blank' },
      { kind: 'paragraph', segments: [{ text: 'Second' }] },
    ]);
  });

  it('falls back to a single unformatted segment for plain text', () => {
    expect(parseMarkdownSubset('Just plain text')).toEqual([
      { kind: 'paragraph', segments: [{ text: 'Just plain text' }] },
    ]);
  });
});
