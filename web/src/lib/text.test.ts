import { describe, expect, it } from 'vitest';
import { formatDuration, normalizeText, searchVariants, transliterate } from './text';

describe('transliteration (client)', () => {
  it('handles Devanagari', () => {
    expect(transliterate('अरिजीत सिंह')).toBe('arijit singh');
    expect(transliterate('पंजाबी')).toBe('punjabi');
    expect(transliterate('हरियाणवी')).toBe('haryanvi');
    expect(transliterate('राजस्थानी')).toBe('rajasthani');
    expect(transliterate('भोजपुरी')).toBe('bhojpuri');
  });

  it('handles Gurmukhi', () => {
    expect(transliterate('ਏਪੀ ਢਿੱਲੋਂ')).toBe('epi dhillon');
  });

  it('normalizes both scripts to the same key', () => {
    expect(normalizeText('अरिजीत सिंह')).toBe(normalizeText('Arijit Singh'));
  });

  it('builds search variants', () => {
    expect(searchVariants('अरिजीत')).toContain('arijit');
  });
});

describe('formatDuration', () => {
  it('formats', () => {
    expect(formatDuration(90)).toBe('1:30');
    expect(formatDuration(undefined)).toBe('--:--');
  });
});
