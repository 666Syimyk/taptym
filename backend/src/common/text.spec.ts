import { foldKyrgyz, normalizeSearchText, queryVariants, clampText } from './text';

describe('text normalization', () => {
  it('folds Kyrgyz-specific letters to Russian neighbours', () => {
    expect(foldKyrgyz('көз айнек')).toBe('коз аинек');
    expect(foldKyrgyz('Үй')).toBe('уи');
    expect(foldKyrgyz('ңӨ')).toBe('но');
  });

  it('normalizes punctuation, case and whitespace', () => {
    expect(normalizeSearchText('  Найден   ЧЁРНЫЙ, кошелёк!!! ')).toBe('наиден черныи кошелек');
  });

  it('produces a transliterated variant for Latin queries only', () => {
    expect(queryVariants('кошелек')).toEqual(['кошелек']);
    const variants = queryVariants('koshelek');
    expect(variants).toContain('koshelek');
    expect(variants).toContain('кошелек');
    expect(queryVariants('   ')).toEqual([]);
  });

  it('clamps text length and collapses whitespace', () => {
    expect(clampText('a   b', 10)).toBe('a b');
    expect(clampText('abcdef', 3)).toBe('abc');
    expect(clampText(null, 3)).toBe('');
  });
});
