import { asciidoctor } from '../singleton';
import { extract } from '../extract';

describe('extract', () => {
  function adoc(text: string) {
    return asciidoctor.load(text, {});
  }

  it('extracts document title', () => {
    const document = adoc('= The Title\n');
    expect(extract(document)).toEqual([
      { text: 'The Title' },
    ]);
  });

  it('extracts section headers', () => {
    const document = adoc('== Section Level 1\n\n=== Section Level 2\n\n');
    expect(extract(document)).toEqual([
      { text: 'Section Level 1' },
      { text: 'Section Level 2' },
    ]);
  });

  it('extracts paragraphs', () => {
    const document = adoc('A paragraph.\nStill the *same* paragraph.\n\nAnd a new one.\n');
    expect(extract(document)).toEqual([
      { text: 'A paragraph.\nStill the *same* paragraph.' },
      { text: 'And a new one.' },
    ]);
  });

  it('extracts image macros', () => {
    const document = adoc('image:logo.svg[]\n');
    expect(extract(document)).toEqual([
      { text: 'image:logo.svg[]' },
    ]);
  });

  it('extracts table cells', () => {
    const document = adoc(
      `[cols=2*,options="header,footer"]\n|===\n|Column A |Column B \n\
|Yes |No\n|Perhaps |Maybe \n|Footer A |Footer B\n|===\n`);
    expect(extract(document)).toEqual([
      { text: 'Column A' }, { text: 'Column B' },
      { text: 'Yes' }, { text: 'No' },
      { text: 'Perhaps' }, { text: 'Maybe' },
      { text: 'Footer A' }, { text: 'Footer B' },
    ]);
  });
});
