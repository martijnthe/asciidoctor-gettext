import { asciidoctor } from '../singleton';
import { allBuiltinsAttributeFilter, extract } from '../extract';

describe('extract', () => {
  const options = {
    attributeFilter: allBuiltinsAttributeFilter,
  };

  function adoc(text: string) {
    return asciidoctor.load(text, {});
  }

  it('extracts document title', () => {
    const document = adoc('= The Title\n');
    expect(extract(document, options)).toEqual([
      { text: 'The Title' },
    ]);
  });

  it('extracts section headers', () => {
    const document = adoc('== Section Level 1\n\n=== Section Level 2\n\n');
    expect(extract(document, options)).toEqual([
      { text: 'Section Level 1' },
      { text: 'Section Level 2' },
    ]);
  });

  it('extracts paragraphs', () => {
    const document = adoc('A paragraph.\nStill the *same* paragraph.\n\nAnd a new one.\n');
    expect(extract(document, options)).toEqual([
      { text: 'A paragraph.\nStill the *same* paragraph.' },
      { text: 'And a new one.' },
    ]);
  });

  it('extracts inline images', () => {
    const document = adoc('image:logo.svg[]\n');
    expect(extract(document, options)).toEqual([
      { text: 'image:logo.svg[]' },
    ]);
  });

  it('extracts block image macros', () => {
    const document = adoc('image::logo.svg[]\n');
    expect(extract(document, options)).toEqual([
      { text: 'logo.svg' },
    ]);
  });

  it('extracts block image macros with alt text', () => {
    const document = adoc('image::logo.svg[Our fancy logo]\n');
    expect(extract(document, options)).toEqual([
      { text: 'logo.svg' },
      { text: 'Our fancy logo'},
    ]);
  });

  it('extracts table cells', () => {
    const document = adoc(
      `[cols=2*,options='header,footer']\n|===\n|Column A |Column B \n\
|Yes |No\n|Perhaps |Maybe \n|Footer A |Footer B\n|===\n`);
    expect(extract(document, options)).toEqual([
      { text: 'Column A' }, { text: 'Column B' },
      { text: 'Yes' }, { text: 'No' },
      { text: 'Perhaps' }, { text: 'Maybe' },
      { text: 'Footer A' }, { text: 'Footer B' },
    ]);
  });

//   it('extracts lists', () => {
//     const document = adoc(`
// item one::
// * subitem one one
// * subitem one two
// item two::
// * subitem two
// `);
//     expect(extract(document, options)).toEqual([
//       { text: 'logo.svg' },
//       { text: 'Our fancy logo'},
//     ]);
//   });

  it('extracts builtin, localizable attributes', () => {
    const document = adoc('');
    expect(extract(document)).toEqual([
      { text: 'Caution'},
      { text: 'Important'},
      { text: 'Note'},
      { text: 'Tip'},
      { text: 'Warning'},
      { text: 'Example'},
      { text: 'Figure'},
      { text: 'Table'},
      { text: 'Table of Contents'},
      { text: 'NAME'},
      { text: 'Section'},
      { text: 'Chapter'},
      { text: 'Appendix'},
      { text: 'Appendix'},
      { text: 'Untitled'},
      { text: 'Version'},
      { text: 'Last updated'},
    ]);
  });

  it('extracts custom attributes, but leaves references intact', () => {
    const document = adoc(':my_var: something to translate\n\nThis is {my_var}\n');
    expect(extract(document, options)).toEqual([
      { text: 'something to translate'},
      { text: 'This is {my_var}'},
    ]);
  });

  it('ignores page breaks', () => {
    const document = adoc('<<<\n');
    expect(extract(document, options)).toEqual([]);
  });

  it('ignores toc::[]', () => {
    const document = adoc(':toc: macro\n\ntoc::[]\n');
    expect(extract(document, options)).toEqual([]);
  });

});
