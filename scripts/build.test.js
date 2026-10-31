import { describe, it, expect } from 'vitest';
import { stamp } from './build.js';

describe('stamp', () => {
  it('replaces what matches', () => {
    expect(stamp('a 1 b', /\d/, '2', 'f')).toBe('a 2 b');
  });

  it('throws on a miss, naming the file', () => {
    expect(() => stamp('no year here', /\d{4}/, '2026', 'docs/x.html')).toThrow(
      'docs/x.html: nothing to stamp'
    );
  });

  it('takes a value that does not change: the year on a page is often the year stamped', () => {
    const page = '<span class="year">2026</span>';
    expect(stamp(page, /<span class="year">\d{4}<\/span>/g, page, 'f')).toBe(page);
  });

  it('replaces every match of a g pattern, twice over', () => {
    const pattern = /\d/g;
    expect(stamp('1 1', pattern, '2', 'f')).toBe('2 2');
    expect(stamp('1 1', pattern, '3', 'f')).toBe('3 3');
  });
});
