# asciidoctor-gettext

[![Build Status](https://travis-ci.org/martijnthe/asciidoctor-gettext.svg?branch=master)](https://travis-ci.org/martijnthe/asciidoctor-gettext)
[![Coverage Status](https://coveralls.io/repos/github/martijnthe/asciidoctor-gettext/badge.svg?branch=master)](https://coveralls.io/github/martijnthe/asciidoctor-gettext?branch=master)
[![npm version](https://badge.fury.io/js/asciidoctor-gettext.svg)](http://badge.fury.io/js/asciidoctor-gettext)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

gettext/po string extraction tool for asciidoc documents.

- Uses `asciidoctor.js` as parser.
- Uses `gettext-parser` as .po generator.

## Extracting

Basic example
```
$ asciidoctor-gettext gettextize -m path/to/master.adoc -p output.pot 
```

This will extract all texts from `master.adoc` and create `output.pot`.

## Injecting Translations

Basic example
```
$ asciidoctor-gettext translate -m path/to/master.adoc -p dutch.po -l output.adoc
```

This will create `output.adoc`, taking `master.adoc` and rewriting all localizable strings using the given `.po` file.
Note that the resulting output document may be marked up slightly different compared to the input document. However,
when transforming it `.html` (using `asciidoctor` itself) the output should be formatted the identically as the
original.
