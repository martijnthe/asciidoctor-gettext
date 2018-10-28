import { escapePipes, quoteAttributeValueIfNeeded, rewrite } from '../rewrite';
import AsciiDoctorFactory from 'asciidoctor.js';
import * as fs from 'fs';
import Options = AsciiDoctorJs.Options;

describe('rewrite', () => {

  function convert(input: string, asciidocOptions: Options = {}): string {
    const asciidoctor = AsciiDoctorFactory();
    return asciidoctor.convert(input, asciidocOptions);
  }

  function doRewrite(input: string, asciidocOptions: Options = {}) {
    const filter = jest.fn(input => input);
    const output = rewrite(input, filter, asciidocOptions);
    // The output does not have to match the input. For example, superfluous newlines are removed,
    // but this doesn't affect the document's structure.
    // The Litmus test of making sure rewrite() is properly rewriting the document:
    // Run asciidoctor.convert() on both input and output and make sure they are equal.
    expect(convert(output, asciidocOptions)).toEqual(convert(input, asciidocOptions));
    return filter;
  }

  it('rewrites empty document', () => {
    const input = '';
    const filter = doRewrite(input);
  });

  it('rewrites document title', () => {
    const input = '= The Title\n';
    const filter = doRewrite(input);
    expect(filter).toHaveBeenCalledWith('The Title');
  });

  it('rewrites section headers', () => {
    const input = `
[[section-level-1]]
[role="title-role"]
== Section Level 1

=== Section Level 2

A paragraph.
`;
    const filter = doRewrite(input);
    expect(filter).toHaveBeenCalledWith('Section Level 1');
    expect(filter).toHaveBeenCalledWith('Section Level 2');
    expect(filter).toHaveBeenCalledWith('A paragraph.');
  });

  it('rewrites paragraphs', () => {
    const input = `
.Paragraph Title
A paragraph.
__Still__ the *same* paragraph.

[[my-paragraph-id]]
[role="xyz"]
And a \`new\` one.`;
    const filter = doRewrite(input);
    expect(filter).toHaveBeenCalledWith('A paragraph.\n__Still__ the *same* paragraph.');
    expect(filter).toHaveBeenCalledWith('And a `new` one.');
  });

  it('does not escape to HTML entities', () => {
    const input = '== Tom & Jerry <>\n';
    const filter = doRewrite(input);
    expect(filter).toHaveBeenCalledWith('Tom & Jerry <>');
  });

  it('rewrites preamble', () => {
    const input = `
= Title
Au Thor

Preamble Body.

== Section Title`;
    const filter = doRewrite(input);
    expect(filter).toHaveBeenCalledWith('Title');
    expect(filter).toHaveBeenCalledWith('Preamble Body.');
    expect(filter).toHaveBeenCalledWith('Section Title');
  });

  it('rewrites inline images', () => {
    const input = 'image:logo.svg[]\n';
    const filter = doRewrite(input);
    expect(filter).toHaveBeenCalledWith('image:logo.svg[]');
  });

  it('rewrites block image macros', () => {
    const input = `
[#img-sunset]
.A mountain sunset
[link=https://www.flickr.com/photos/javh/5448336655]
image::sunset.jpg[Sunset,300,200,role=abc,float=right,align=center]
Some text
`;
    const filter = doRewrite(input);
    expect(filter).toHaveBeenCalledWith('A mountain sunset');
    expect(filter).toHaveBeenCalledWith('sunset.jpg');
    expect(filter).toHaveBeenCalledWith('Sunset');
    expect(filter).toHaveBeenCalledWith('Some text');
  });

  it('rewrites custom attributes, but leaves references intact', () => {
    // my_var spans multiple lines:
    const input = `
= Document title

:my_var: something\\nto translate

This is {my_var}

:my_var: assigning it again
:another_var: ho ho ho
:another_var: ha ha ha

Using the reassigned attribute {my_var} {another_var}

Another paragraph {my_var} {another_var}
`;
    const filter = doRewrite(input);
    expect(filter).toHaveBeenCalledWith('Document title');
    expect(filter).toHaveBeenCalledWith('something\\nto translate');
    expect(filter).toHaveBeenCalledWith('This is {my_var}');
  });

  it('rewrites table cells', () => {
    const input = `
:my_var: Footer B

[[my-table-id]]
.Table Title
[.rolename,cols=2*^,options='header,footer',frame=topbot,grid=rows,stripes=none,%rotate,\
caption="Table A. "]
|===
|Column A |Column B
|Yes |No
|Perhaps |Escape the \\| pipes \\|
2*|Same
2+|Span rows
.2+|Span cols | Something
| Else
|Footer A |{my_var}

| Multi
line cell
| Another multi
line cell
|===

// This table fails to be rewritten when not synthesizing the "cols" attribute:
.Second table
|===
2+| 2+| cm 2+| inch
|62 |0-3M |30 | 53 | 11,8 |20,9
|===
`;
    const filter = doRewrite(input);
    expect(filter).toHaveBeenCalledWith('Footer B');
    expect(filter).toHaveBeenCalledWith('Table Title');
    expect(filter).toHaveBeenCalledWith('Column A');
    expect(filter).toHaveBeenCalledWith('Column B');
    expect(filter).toHaveBeenCalledWith('Yes');
    expect(filter).toHaveBeenCalledWith('No');
    expect(filter).toHaveBeenCalledWith('Perhaps');
    expect(filter).toHaveBeenCalledWith('Escape the | pipes |');
    expect(filter).toHaveBeenCalledWith('Footer A');
    expect(filter).toHaveBeenCalledWith('{my_var}');
    expect(filter).toHaveBeenCalledWith('Multi\nline cell');
    expect(filter).toHaveBeenCalledWith('Another multi\nline cell');
  });

  it('rewrites lists', () => {
    const input = `
[[my-list-id]]
.List Title
Operating Systems::
  Linux:::
    . Fedora
      * Desktop
    . Ubuntu
      * Desktop
      * Server
  BSD:::
    . FreeBSD
    . NetBSD

Cloud Providers::
  PaaS:::
    . OpenShift
    . CloudBees
  IaaS:::
    . Amazon EC2
    . Rackspace

//-

* Apples
* Oranges
`;
    const filter = doRewrite(input);
    expect(filter).toHaveBeenCalledWith('List Title');
    expect(filter).toHaveBeenCalledWith('Operating Systems');
    expect(filter).toHaveBeenCalledWith('Linux');
    expect(filter).toHaveBeenCalledWith('Fedora');
    expect(filter).toHaveBeenCalledWith('Desktop');
    expect(filter).toHaveBeenCalledWith('Ubuntu');
    expect(filter).toHaveBeenCalledWith('Server');
    expect(filter).toHaveBeenCalledWith('BSD');
    expect(filter).toHaveBeenCalledWith('FreeBSD');
    expect(filter).toHaveBeenCalledWith('NetBSD');
    expect(filter).toHaveBeenCalledWith('Cloud Providers');
    expect(filter).toHaveBeenCalledWith('PaaS');
    expect(filter).toHaveBeenCalledWith('OpenShift');
    expect(filter).toHaveBeenCalledWith('CloudBees');
    expect(filter).toHaveBeenCalledWith('IaaS');
    expect(filter).toHaveBeenCalledWith('Amazon EC2');
    expect(filter).toHaveBeenCalledWith('Rackspace');
  });

  it('rewrites literals', () => {
    const input = '....\ntake this literally\n....';
    const filter = doRewrite(input);
    expect(filter).toHaveBeenCalledWith('take this literally');
  });

  it('rewrites pass-throughs', () => {
    const input = '++++\ntake this literally\n++++';
    const filter = doRewrite(input);
    expect(filter).toHaveBeenCalledWith('take this literally');
  });

  it('rewrites quote blocks', () => {
    const input = `
.Gettysburg Address
[#gettysburg]
[quote, Abraham Lincoln, Address delivered at the dedication of the Cemetery at Gettysburg]
____
Four score and seven years ago our fathers brought forth
on this continent a new nation...
____`;
    const filter = doRewrite(input);
    expect(filter).toHaveBeenCalledWith('Gettysburg Address');
    expect(filter).toHaveBeenCalledWith(
      'Four score and seven years ago our fathers brought forth\non this continent a new nation...');
    expect(filter).toHaveBeenCalledWith(
      'Address delivered at the dedication of the Cemetery at Gettysburg');
  });

  it('rewrites verse blocks', () => {
    const input = `[verse, Carl Sandburg, Fog]
____
The fog comes
on little cat feet.

It sits looking
over harbor and city
on silent haunches
and then moves on.
____`;
    const filter = doRewrite(input);
    expect(filter).toHaveBeenCalledWith(`The fog comes
on little cat feet.

It sits looking
over harbor and city
on silent haunches
and then moves on.`);
  });

  it('rewrites sidebars', () => {
    const input = `.AsciiDoc history
****
AsciiDoc was first released in Nov 2002
****
`;
    const filter = doRewrite(input);
    expect(filter).toHaveBeenCalledWith('AsciiDoc history');
    expect(filter).toHaveBeenCalledWith('AsciiDoc was first released in Nov 2002');
  });

  it('rewrites admonition block with example', () => {
    const input = `[IMPORTANT]
.Feeding the Werewolves
====
While werewolves are hardy community members, keep in mind the following dietary concerns:

. They are allergic to cinnamon.
. More than two glasses of orange juice in 24 hours makes them howl in harmony with alarms and sirens.
. Celery makes them sad.
====`;
    const filter = doRewrite(input);
    expect(filter).toHaveBeenCalledWith('Feeding the Werewolves');
    expect(filter).toHaveBeenCalledWith(
      'While werewolves are hardy community members, ' +
      'keep in mind the following dietary concerns:');
    expect(filter).toHaveBeenCalledWith('They are allergic to cinnamon.');
    expect(filter).toHaveBeenCalledWith(
      'More than two glasses of orange juice in 24 hours makes ' +
      'them howl in harmony with alarms and sirens.');
    expect(filter).toHaveBeenCalledWith('Celery makes them sad.');
  });

  it('rewrites "air quotes"', () => {
    const input = `[, Richard M. Nixon]
""
When the President does it, that means that it's not illegal.
""`;
    const filter = doRewrite(input);
    expect(filter).toHaveBeenCalledWith('When the President does it, that means that it\'s not illegal.');
  });

  it('rewrites listing', () => {
    const input = '[listing]\nThis is an example of a paragraph styled with listing.';
    const filter = doRewrite(input);
    expect(filter).toHaveBeenCalledWith('This is an example of a paragraph styled with listing.');
  });

  it('rewrites source', () => {
    const input = `[source,js]
----
console.log('hello, world');
----`;
    const filter = doRewrite(input);
    expect(filter).toHaveBeenCalledWith('console.log(\'hello, world\');');
  });

  it('rewrites passthroughs', () => {
    const input = 'The text pass:[<u>underline me</u>] is underlined.';
    const filter = doRewrite(input);
    expect(filter).toHaveBeenCalledWith('The text pass:[<u>underline me</u>] is underlined.');
  });

  it('rewrites everything within conditionals', () => {
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
    const filter = doRewrite(input);
    expect(filter).toHaveBeenCalledWith('Unreachable');
    expect(filter).toHaveBeenCalledWith('This content is for GitHub only.');
    expect(filter).toHaveBeenCalledWith('This content is NOT for GitHub.');
    expect(filter).toHaveBeenCalledWith('This document has a version number of {revnumber}.');
    expect(filter).toHaveBeenCalledWith('Asciidoc looks for the last ] in the string');
  });

  it('ignores comments', () => {
    const input = '// a single line comment\n////\n a multi\nline comment\n////';
    const filter = doRewrite(input);
    expect(filter).not.toHaveBeenCalled();
  });

  it('ignores page breaks', () => {
    const input = '<<<\n';
    const filter = doRewrite(input);
    expect(filter).not.toHaveBeenCalled();
  });

  it('ignores horizontal rules', () => {
    const input = '---\n';
    const filter = doRewrite(input);
    expect(filter).not.toHaveBeenCalled();
  });

  it('ignores toc::[]', () => {
    const input = ':toc: macro\n\ntoc::[]\n';
    const filter = doRewrite(input);
    expect(filter).not.toHaveBeenCalled();
  });

  it('ignores include::...[]', () => {
    const input = 'include::bar.adoc[]\n';
    const filter = doRewrite(input);
    expect(filter).not.toHaveBeenCalled();
  });

  it('rewrites floating title', () => {
    const input = `
[[my-float-title-id]]
[float]
{doctitle}
----------
A new paragraph.`;
    const filter = doRewrite(input);
    expect(filter).toHaveBeenCalledWith('{doctitle}');
    expect(filter).toHaveBeenCalledWith('A new paragraph.');
  });

  it('rewrites title and id assigned to an included block', () => {
    const input = `
[[some-id]]
.Title of included block text.
include::other.adoc[]

Text created as new block. Appending to included block is not supported.`;
    const filter = doRewrite(input);
    expect(filter).toHaveBeenCalledWith('Title of included block text.');
    expect(filter).toHaveBeenCalledWith(
      'Text created as new block. Appending to included block is not supported.');
  });
});

test('escapePipes', () => {
  expect(escapePipes('| mind the pipes |')).toEqual('\\| mind the pipes \\|');
});

test('quoteAttributeValueIfNeeded', () => {
  expect(quoteAttributeValueIfNeeded('""')).toEqual('"\\"\\""');
  expect(quoteAttributeValueIfNeeded('\'')).toEqual('"\'"');
  expect(quoteAttributeValueIfNeeded(' ')).toEqual('" "');
  expect(quoteAttributeValueIfNeeded(',')).toEqual('","');
  expect(quoteAttributeValueIfNeeded('" \',\' "')).toEqual('"\\" \',\' \\""');
});
