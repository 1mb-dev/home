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

  it('takes a stamp equal to what it replaces', () => {
    expect(stamp('Expires: x', /^Expires: .*$/m, 'Expires: x', 'f')).toBe('Expires: x');
  });
});
