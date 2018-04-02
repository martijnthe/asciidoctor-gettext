import { blacklist } from '../blacklist';

describe('blacklist', () => {
  it('filters on a per-line basis', () => {
    const extractions = [
      { text: 'foo\nbar' },
      { text: 'bar' },
      { text: 'barney\ndumbar' },
      { text: 'doop' },
    ];
    const blacklistRegexes = [ /doop/, /^bar/ ];
    const result = blacklist(extractions, blacklistRegexes);
    expect(result).toEqual([
      { text: 'foo' },
      { text: 'dumbar' },
    ]);
  });
});
