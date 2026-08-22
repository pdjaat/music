import { describe, expect, it } from 'vitest';
import { dedupKey, formatDuration, normalizeText, searchVariants, transliterateToLatin } from './normalize.js';

describe('transliteration', () => {
  it('converts Devanagari to Latin', () => {
    expect(transliterateToLatin('अरिजीत सिंह')).toBe('arijit singh');
    expect(transliterateToLatin('संगीत')).toBe('sangeet');
    expect(transliterateToLatin('पंजाबी')).toBe('punjabi');
  });

  it('converts Gurmukhi to Latin', () => {
    expect(transliterateToLatin('ਏਪੀ ਢਿੱਲੋਂ')).toBe('epi dhillon');
    expect(transliterateToLatin('ਪੰਜਾਬੀ')).toBe('punjabi');
  });

  it('converts Tamil', () => {
    expect(transliterateToLatin('தமிழ்')).toBe('tamil');
  });

  it('converts Gujarati, Odia and Bengali', () => {
    expect(transliterateToLatin('ગુજરાતી')).toBe('gujarati');
    expect(transliterateToLatin('ଓଡ଼ିଆ')).toContain('odia');
    expect(transliterateToLatin('বাংলা')).toBe('bangla');
  });

  it('normalizes case, diacritics and punctuation', () => {
    expect(normalizeText('Arijit Singh')).toBe('arijit singh');
    expect(normalizeText('AP Dhillon')).toBe('ap dhillon');
    expect(normalizeText('Khasa Aala Chahar')).toBe('khasa aala chahar');
    expect(normalizeText('  Arijit  , Singh! ')).toBe('arijit singh');
  });

  it('produces matching dedup keys for Latin and Indic spellings', () => {
    expect(dedupKey('अरिजीत सिंह', 'Unknown')).toBe(dedupKey('Arijit Singh', 'Unknown'));
  });

  it('builds search variants', () => {
    const variants = searchVariants('अरिजीत');
    expect(variants).toContain('अरिजीत');
    expect(variants).toContain('arijit');
  });
});

describe('formatDuration', () => {
  it('formats seconds', () => {
    expect(formatDuration(65)).toBe('1:05');
    expect(formatDuration(0)).toBe('--:--');
    expect(formatDuration(undefined)).toBe('--:--');
  });
});
