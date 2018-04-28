# asciidoctor-gettext

[![Build Status](https://travis-ci.org/martijnthe/asciidoctor-gettext.svg?branch=master)](https://travis-ci.org/martijnthe/asciidoctor-gettext)
[![Coverage Status](https://coveralls.io/repos/github/martijnthe/asciidoctor-gettext/badge.svg?branch=master)](https://coveralls.io/github/martijnthe/asciidoctor-gettext?branch=master)
[![npm version](https://badge.fury.io/js/asciidoctor-gettext.svg)](http://badge.fury.io/js/asciidoctor-gettext)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

gettext/po string extraction tool for asciidoc documents.

- Uses `asciidoctor.js` as parser.
- Uses `gettext-parser` as .po generator.

## THIS IS WORK IN PROGRESS

Use at your own risk ;P

## Extracting

Basic example
```
$ asciidoctor-gettext gettextize -m path/to/master.adoc -p output.pot 
```

This will extract all texts from `master.adoc` and create `output.pot`.

## Injecting Translations

TODO