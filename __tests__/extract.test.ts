import { allBuiltinsAttributeFilter, extract } from '../extract';

describe('extract', () => {
  const options = {
    attributeFilter: allBuiltinsAttributeFilter,
  };

  it('extracts document title', () => {
    const input = '= The Title\n';
    expect(extract(input, options)).toEqual([
      { text: 'The Title' },
    ]);
  });

  it('extracts section headers', () => {
    const input = '== Section Level 1\n\n=== Section Level 2\n\n';
    expect(extract(input, options)).toEqual([
      { text: 'Section Level 1' },
      { text: 'Section Level 2' },
    ]);
  });

  it('extracts paragraphs', () => {
    const input = 'A paragraph.\n__Still__ the *same* paragraph.\n\nAnd a `new` one.\n';
    expect(extract(input, options)).toEqual([
      { text: 'A paragraph.\n__Still__ the *same* paragraph.' },
      { text: 'And a `new` one.' },
    ]);
  });

  it('does not escape to HTML entities', () => {
    const input = '== Tom & Jerry <>\n';
    expect(extract(input, options)).toEqual([
      { text: 'Tom & Jerry <>' },
    ]);
  });

  it('extracts preamble', () => {
    const input = '= Title\nAu Thor\n\nPreamble Body.\n\n== Section Title';
    expect(extract(input, options)).toEqual([
      { text: 'Title' },
      { text: 'Preamble Body.' },
      { text: 'Section Title' },
    ]);
  });

  it('extracts inline images', () => {
    const input = 'image:logo.svg[]\n';
    expect(extract(input, options)).toEqual([
      { text: 'image:logo.svg[]' },
    ]);
  });

  it('extracts block image macros', () => {
    const input = 'image::logo.svg[]\n';
    expect(extract(input, options)).toEqual([
      { text: 'logo.svg' },
    ]);
  });

  it('extracts block image macros with alt text', () => {
    const input = 'image::logo.svg[Our fancy logo]\n';
    expect(extract(input, options)).toEqual([
      { text: 'logo.svg' },
      { text: 'Our fancy logo' },
    ]);
  });

  it('extracts table cells', () => {
    const input =
      `:my_var: Footer B\n\n.Table Title\n[cols=2*,options='header,footer']\n|===\n|Column A |Column B \n\
|Yes |No\n|Perhaps |Maybe \n|Footer A |{my_var}\n|===\n`;
    expect(extract(input, options)).toEqual([
      { text: 'Footer B' },
      { text: 'Table Title' },
      { text: 'Column A' }, { text: 'Column B' },
      { text: 'Yes' }, { text: 'No' },
      { text: 'Perhaps' }, { text: 'Maybe' },
      { text: 'Footer A' },
      // Don't substitute variables:
      { text: '{my_var}' },
    ]);
  });

  it('extracts lists', () => {
    const input = `
.List Title
item one::
* subitem one one
* subitem one two
item two::
* subitem two
`;
    expect(extract(input, options)).toEqual([
      { text: 'List Title' },
      { text: 'item one' },
      { text: 'subitem one one' },
      { text: 'subitem one two' },
      { text: 'item two' },
      { text: 'subitem two' },
    ]);
  });

  it('extracts literals', () => {
    const input = '....\ntake this literally\n....';
    expect(extract(input, options)).toEqual([{
      text: 'take this literally',
    }]);
  });

  it('extracts builtin, localizable attributes', () => {
    const input = '';
    expect(extract(input)).toEqual([
      { text: 'Caution' },
      { text: 'Important' },
      { text: 'Note' },
      { text: 'Tip' },
      { text: 'Warning' },
      { text: 'Example' },
      { text: 'Figure' },
      { text: 'Table' },
      { text: 'Table of Contents' },
      { text: 'Section' },
      { text: 'Part' },
      { text: 'Chapter' },
      { text: 'Appendix' },
      { text: 'Appendix' },
      { text: 'Untitled' },
      { text: 'Version' },
      { text: 'Last updated' },
    ]);
  });

  it('extracts custom attributes, but leaves references intact', () => {
    // my_var spans multiple lines:
    const input = ':my_var: something\\nto translate\n\nThis is {my_var}\n';
    expect(extract(input, options)).toEqual([
      { text: 'something\\nto translate' },
      { text: 'This is {my_var}' },
    ]);
  });

  it('extracts quote blocks', () => {
    const input = `
.Gettysburg Address
[#gettysburg]
[quote, Abraham Lincoln, Address delivered at the dedication of the Cemetery at Gettysburg]
____
Four score and seven years ago our fathers brought forth
on this continent a new nation...
____`;
    expect(extract(input, options)).toEqual([
      { text: 'Gettysburg Address' },
      { text: 'Four score and seven years ago our fathers brought forth\non this continent a new nation...' },
    ]);
  });

  it('extracts verse blocks', () => {
    const input = `[verse, Carl Sandburg, Fog]
____
The fog comes
on little cat feet.

It sits looking
over harbor and city
on silent haunches
and then moves on.
____`;
    expect(extract(input, options)).toEqual([
      { text: `The fog comes
on little cat feet.

It sits looking
over harbor and city
on silent haunches
and then moves on.` },
    ]);
  });

  it('extracts sidebars', () => {
    const input = `.AsciiDoc history
****
AsciiDoc was first released in Nov 2002
****
`;
    expect(extract(input, options)).toEqual([
      { text: 'AsciiDoc history' },
      { text: 'AsciiDoc was first released in Nov 2002' },
    ]);
  });

  it('extracts admonition block with example', () => {
    const input = `[IMPORTANT]
.Feeding the Werewolves
====
While werewolves are hardy community members, keep in mind the following dietary concerns:

. They are allergic to cinnamon.
. More than two glasses of orange juice in 24 hours makes them howl in harmony with alarms and sirens.
. Celery makes them sad.
====`;
    expect(extract(input, options)).toEqual([
      { 'text': 'Feeding the Werewolves' },
      { 'text': 'While werewolves are hardy community members, keep in mind the following dietary concerns:' },
      { 'text': 'They are allergic to cinnamon.' },
      { 'text': 'More than two glasses of orange juice in 24 hours makes them ' +
        'howl in harmony with alarms and sirens.' },
      { 'text': 'Celery makes them sad.' },
    ]);
  });

  it('extracts "air quotes"', () => {
    const input = `[, Richard M. Nixon]
""
When the President does it, that means that it's not illegal.
""`;
    expect(extract(input, options)).toEqual([
      { text: 'When the President does it, that means that it\'s not illegal.' },
    ]);
  });

  it('extracts listing', () => {
    const input = '[listing]\nThis is an example of a paragraph styled with listing.';
    expect(extract(input, options)).toEqual([
      { text: 'This is an example of a paragraph styled with listing.' },
    ]);
  });

  it('extracts source', () => {
    const input = `[source,js]
----
console.log('hello, world');
----`;
    expect(extract(input, options)).toEqual([
      { text: 'console.log(\'hello, world\');' },
    ]);
  });

  it('extracts passthroughs', () => {
    const input = 'The text pass:[<u>underline me</u>] is underlined.';
    expect(extract(input, options)).toEqual([
      { text: 'The text pass:[<u>underline me</u>] is underlined.' },
    ]);
  });

  it('extracts everything within conditionals', () => {
    const input = `ifeval::[1<=0]
Unreachable
endif::[]

ifdef::env-github[]
This content is for GitHub only.
endif::env-github[]

ifndef::env-github[]
This content is NOT for GitHub.
endif::[]

ifdef::revnumber[This document has a version number of {revnumber}.]

ifdef::revnumber[Asciidoc looks for the last ] in the string]
`;
    expect(extract(input, options)).toEqual([
      {
        text: 'Unreachable',
      },
      {
        text: 'This content is for GitHub only.',
      },
      {
        text: 'This content is NOT for GitHub.',
      },
      {
        text: 'This document has a version number of {revnumber}.',
      },
      {
        text: 'Asciidoc looks for the last ] in the string',
      },
    ]);
  });

  it('ignores comments', () => {
    const input = '// a single line comment\n////\n a multi\nline comment\n////';
    expect(extract(input, options)).toEqual([]);
  });

  it('ignores page breaks', () => {
    const input = '<<<\n';
    expect(extract(input, options)).toEqual([]);
  });

  it('ignores horizontal rules', () => {
    const input = '---\n';
    expect(extract(input, options)).toEqual([]);
  });

  it('ignores toc::[]', () => {
    const input = ':toc: macro\n\ntoc::[]\n';
    expect(extract(input, options)).toEqual([]);
  });

  it('ignores include::...[]', () => {
    const input = 'include::bar.adoc[]\n';
    expect(extract(input, options)).toEqual([]);
  });
});
