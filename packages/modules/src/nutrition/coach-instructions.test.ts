import { describe, expect, it } from 'vitest';
import { deriveInstructionsPlainText, sanitizeInstructionsText } from './coach-instructions';

describe('D2 smoke test — sanitizeInstructionsText', () => {
  it('strips HTML tags and event-handler attributes', () => {
    const dirty = 'Prefer <img src=x onerror="steal()"> high-protein breakfasts';
    expect(sanitizeInstructionsText(dirty)).not.toMatch(/[<>]/);
    expect(sanitizeInstructionsText(dirty)).toContain('high-protein breakfasts');
  });

  it('strips zero-width and control characters used to hide text', () => {
    const dirty = 'Focus on lean\u200B\u0000 proteins';
    expect(sanitizeInstructionsText(dirty)).toBe('Focus on lean proteins');
  });

  it('hard-caps length so one bad input cannot balloon prompt cost', () => {
    expect(sanitizeInstructionsText('a'.repeat(5000)).length).toBeLessThanOrEqual(2000);
  });

  it('strips a malformed/unclosed tag as defense in depth', () => {
    const dirty = 'Avoid <script>alert(1) organ meats';
    expect(sanitizeInstructionsText(dirty)).not.toMatch(/[<>]/);
  });

  it('preserves newlines but collapses runs of blank lines', () => {
    const dirty = 'Line one\n\n\n\n\nLine two';
    expect(sanitizeInstructionsText(dirty)).toBe('Line one\n\nLine two');
  });

  it('preserves legitimate content with no HTML/control characters unchanged', () => {
    const clean = '**Prefer** high-protein breakfasts.\n- Keep prep under 10 minutes.';
    expect(sanitizeInstructionsText(clean)).toBe(clean);
  });
});

describe('D2 smoke test — deriveInstructionsPlainText', () => {
  it('strips the markdown-subset syntax coaches type, leaving plain readable text', () => {
    const rich =
      '# Breakfast style\n**Prefer** high-protein options.\n- Keep prep under 10 min\n_no dairy_';
    expect(deriveInstructionsPlainText(rich)).toBe(
      'Breakfast style\nPrefer high-protein options.\nKeep prep under 10 min\nno dairy',
    );
  });

  it('drops empty lines rather than preserving them as blank plain-text lines', () => {
    expect(deriveInstructionsPlainText('First\n\nSecond')).toBe('First\nSecond');
  });
});
