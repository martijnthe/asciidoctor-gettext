import { collate } from '../collate';

describe('collate', () => {
  it('dedupes, keeping the ordering', () => {
    const input = [
      { text: 'hiya' },
      { text: 'lo' },
      { text: 'hiya' },
      { text: 'lolo' },
      { text: 'lolo' },
    ];
    expect(collate(input)).toEqual([
      { text: 'hiya' },
      { text: 'lo' },
      { text: 'lolo' },
    ]);
  });
});
