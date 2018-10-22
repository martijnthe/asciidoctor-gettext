import AsciiDoctorFactory from 'asciidoctor.js';
import Document = AsciiDoctorJs.Document;
import AbstractBlock = AsciiDoctorJs.AbstractBlock;
import { isNil } from './opal-utils';
import Section = AsciiDoctorJs.Section;
import { isArrayOfBlocks } from './common';
import Block = AsciiDoctorJs.Block;
import Image = AsciiDoctorJs.Image;
import Table = AsciiDoctorJs.Table;
import Attributes = AsciiDoctorJs.Attributes;
import ListItem = AsciiDoctorJs.ListItem;
import { getIfBlockRewriter, ifBlockProcessor, rewriteIncludeProcessor, rewritePreprocessor } from './conditionals';
import { nonLocalizableBuiltinAttributeKeys } from './attributes';

export type RewriteTransformer = (extraction: string) => string;

export type Write = (text: string) => void;

interface RewriteMap {
  [key: string]: {
    open: () => void;
    close?: () => void;
  };
}

interface ReWriteState {
  listStack: {
    type: 'dlist' | 'olist' | 'ulist';
    level: number;
  }[];
}

export function rewrite(text: string, transformer: RewriteTransformer): string {
  let outputText = '';
  function write(text: string) {
    outputText += text;
  }

  const rewriteAsciidoctor = AsciiDoctorFactory();
  rewriteAsciidoctor.Extensions.register('rewrite', function() {
    this.preprocessor(rewritePreprocessor);
    this.includeProcessor(rewriteIncludeProcessor);
    this.block(ifBlockProcessor);
  });
  const document = rewriteAsciidoctor.load(text, {});

  const state: ReWriteState = {
    listStack: [],
  };
  rewriteBlock(document, transformer, write, state);

  rewriteAsciidoctor.Extensions.unregister(['rewrite']);
  return outputText;
}

function rewriteAbstractBlockTitle(block: AbstractBlock, transformer: RewriteTransformer, write: Write,
                                   prefix: string = '.') {
  const title = block.title;
  if (!isNil(title)) {
    write(`${prefix}${transformer(title)}\n`);
  }
}

const attributeQuoteNeededRegex = / |,|"|'/;
const doubleQuotesRegex = /"/g;
export function quoteAttributeValueIfNeeded(value: string): string {
  // See https://asciidoctor.org/docs/user-manual/#named-attribute
  // If the value contains a space, comma, or quote character, it must be enclosed in double or single quotes
  // (e.g., name="value with space"). In all other cases, the surrounding quotes are optional. If present,
  // the enclosing quotes are dropped from the parsed value.
  if (!attributeQuoteNeededRegex.test(value)) {
    return value;
  }
  const escapedValue = value.replace(doubleQuotesRegex, '\\"');
  return `"${escapedValue}"`;
}

function getAttributesString(block: AbstractBlock, transformer: RewriteTransformer,
                             localizableKeys: string[] = [], excludingKeys: string[] = [],
                             extraAttributes: Attributes = {}) {
  const blockAttributes = block.getAttributes();
  let attributesString = '';
  for (const attributes of [blockAttributes, extraAttributes]) {
    for (const attributeKey in attributes) {
      if (excludingKeys.includes(attributeKey)) {
        continue;
      }
      const isLocalizable = localizableKeys.includes(attributeKey);
      const origValue = attributes[attributeKey];
      const value = quoteAttributeValueIfNeeded(isLocalizable ? transformer(origValue) : origValue);
      const separator = (attributesString !== '') ? ',' : '';
      attributesString += `${separator}${attributeKey}=${value}`;
    }
  }
  return attributesString;
}

const pipeRegEx = /\|/g;
export function escapePipes(input: string): string {
  return input.replace(pipeRegEx, '\\|');
}

function rewriteBlock(block: AbstractBlock, transformer: RewriteTransformer, write: Write, state: ReWriteState) {
  const titleOnlyRewrite = {
    open: () => {
      rewriteAbstractBlockTitle(block, transformer, write);
    },
  };
  const listRewrite = {
    open: () => {
      updateListStack('push', block, state, write);
      rewriteAbstractBlockTitle(block, transformer, write);
    },
    close: () => {
      updateListStack('pop', block, state, write);
    },
  };
  const rewriteMap: RewriteMap = {
    admonition: {
      open: () => {
        const admonitionBlock = block as Block;
        rewriteAbstractBlockTitle(admonitionBlock, transformer, write);
        write(`[${admonitionBlock.getStyle()}]\n====\n`);
      },
      close: () => {
        write('====\n');
      },
    },
    dlist: listRewrite,
    document: {
      open: () => {
        const document = block as Document;
        if (!isNil(document.header)) {
          const doctitle = transformer(document.header.title);
          write(`= ${doctitle}\n`);
        }
        const attributes = document.getAttributes();
        if (attributes.authors && attributes.authors !== '') {
          write(`${attributes.authors}\n\n`);
        }
        for (const key of document.attributes_modified.hash.$$keys) {
          const isNonLocalizable = nonLocalizableBuiltinAttributeKeys.includes(key);
          const value = isNonLocalizable ? attributes[key] : transformer(attributes[key]);
          write(`:${key}: ${value}\n`);
        }
      },
    },
    if: getIfBlockRewriter(block as Block, transformer, write),
    image: {
      open: () => {
        const imageBlock = block as Image;
        rewriteAbstractBlockTitle(imageBlock, transformer, write);
        const attributes = imageBlock.getAttributes();
        const localizableKeys = ['alt', 'default-alt', 'caption'];
        const excludingKeys = ['attribute_entries'];
        const attributesString = getAttributesString(imageBlock, transformer, localizableKeys, excludingKeys);
        write(`image::${transformer(attributes.target)}[${attributesString}]`);
      },
    },
    list_item: {
      open: () => {
        const li = block as ListItem;
        const text = li.text;
        if (isNil(text) || text === '') {
          return;
        }
        const transformedText = transformer(text);
        const topOfStack = state.listStack[state.listStack.length - 1];
        const indent = ' '.repeat(topOfStack.level * 2);
        switch (li.parent.node_name) {
          case 'dlist':
            const colons = ':'.repeat(1 + topOfStack.level);
            write(`${indent}${transformedText}${colons}\n`);
            break;
          case 'olist':
            const periods = '.'.repeat(topOfStack.level);
            write(`${indent}${periods} ${transformedText}\n`);
            break;
          case 'ulist':
            const asterisks = '*'.repeat(topOfStack.level);
            write(`${indent}${asterisks} ${transformedText}\n`);
            break;
        }
      },
    },
    listing: {
      open: () => {
        const listing = block as Block;
        const attributesString = getAttributesString(listing, transformer, [], ['style']);
        const text = transformer(listing.getSource());
        write(`[${listing.getStyle()},${attributesString}]\n${text}\n`);
      },
    },
    literal: {
      open: () => {
        const literal = block as Block;
        const text = transformer(literal.getSource());
        rewriteAbstractBlockTitle(literal, transformer, write);
        write(`....\n${text}\n....`);
      },
    },
    olist: listRewrite,
    page_break: {
      open: () => {
        write('<<<\n');
      },
    },
    quote: {
      open: () => {
        rewriteAbstractBlockTitle(block, transformer, write);
        const localizableKeys = ['title', 'citetitle'];
        const excludingKeys = ['style', 'title'];
        const attributesString = getAttributesString(block, transformer, localizableKeys, excludingKeys);
        write(`[quote, ${attributesString}]\n____\n`);
      },
      close: () => {
        write('____\n');
      },
    },
    section: {
      open: () => {
        const section = block as Section;
        const prefix = '='.repeat(section.level + 1);
        write(`${prefix} ${transformer(section.title)}\n`);
      },
    },
    table: {
      open: () => {
        const table = block as Table;
        rewriteAbstractBlockTitle(table, transformer, write);
        const localizableKeys = [''];
        const excludingKeys = ['rowcount', 'colcount', 'tablepcwidth'];
        const attributesString = getAttributesString(table, transformer, localizableKeys, excludingKeys, {
          caption: table.caption,
        });
        write(`[${attributesString}]\n|===\n`);
        const rowsKeys: (keyof Table['rows'])[] = ['head', 'body', 'foot'];
        for (const rowKey of rowsKeys) {
          for (const row of table.rows[rowKey]) {
            for (const cell of row) {
              const rowspan = isNil(cell.rowspan) ? 1 : cell.rowspan;
              const colspan = isNil(cell.colspan) ? 1 : cell.colspan;
              const text = escapePipes(transformer(cell.text));
              write(`${colspan}.${rowspan}+|${text}\n`);
            }
            write('\n');
          }
        }
        write(`|===\n`);
      },
    },
    thematic_break: {
      open: () => {
        write('---\n');
      },
    },
    toc: {
      open: () => {
        write('toc::[]\n');
      },
    },
    paragraph: {
      open: () => {
        const paragraphBlock = block as Block;
        rewriteAbstractBlockTitle(paragraphBlock, transformer, write);
        write(`${transformer(paragraphBlock.getSource())}\n\n`);
      },
    },
    preamble: titleOnlyRewrite,
    sidebar: {
      open: () => {
        rewriteAbstractBlockTitle(block, transformer, write);
        write('****\n');
      },
      close: () => {
        write('****\n');
      },
    },
    ulist: listRewrite,
    verse: {
      open: () => {
        const verse = block as Block;
        rewriteAbstractBlockTitle(verse, transformer, write);
        const localizableKeys = ['title', 'citetitle'];
        const excludingKeys = ['style', 'title'];
        const attributesString = getAttributesString(block, transformer, localizableKeys, excludingKeys);
        const text = transformer(verse.getSource());
        write(`[verse, ${attributesString}]\n____\n${text}\n____\n`);
      },
    },
  };

  const rewrite = rewriteMap[block.node_name];
  if (!rewrite) {
    console.error(`Unknown node name: '${block.node_name}'`);
    return;
  }

  rewrite.open();
  rewriteBlocks(block.getBlocks(), transformer, write, state);
  if (rewrite.close) {
    rewrite.close();
  }
}

function nodeNameIsList(nodeName: string): nodeName is 'dlist' | 'olist' | 'ulist' {
  return ['dlist', 'olist', 'ulist'].includes(nodeName);
}

function updateListStack(pushOrPop: 'push' | 'pop', block: AbstractBlock, state: ReWriteState, write: Write) {
  const name = block.node_name as 'dlist' | 'olist' | 'ulist';
  const blockIsList = nodeNameIsList(name);
  if (!blockIsList) {
    throw new Error('Block is expected to be dlist, olist or ulist');
  }
  if (state.listStack.length > 0) {
    const topOfStack = state.listStack[state.listStack.length - 1];
    if (pushOrPop === 'push') {
      if (topOfStack.type === name) {
        topOfStack.level++;
      } else {
        state.listStack.push({ type: name, level: 1 });
      }
    } else {
      topOfStack.level--;
      if (topOfStack.level === 0) {
        state.listStack.pop();
        if (state.listStack.length === 0) {
          // See https://asciidoctor.org/docs/user-manual/#separating-lists
          // If you have adjacent lists, they have the tendency to want to fuse together. To force lists apart,
          // insert a line comment (//) surrounded by blank lines between the two lists.
          write('\n\n//-\n\n');
        }
      }
    }
  } else {
    if (pushOrPop === 'pop') {
      throw new Error('listStack contains no items!');
    }
    state.listStack.push({ type: name, level: 1 });
  }
}

function rewriteBlocks(blocks: Array<AbstractBlock | AbstractBlock[]>,
                       transformer: RewriteTransformer, write: Write, state: ReWriteState) {
  blocks.forEach((block: AbstractBlock | AbstractBlock[]) => {
    // Oddly, the blocks of a dlist are arrays of arrays of blocks...
    if (isArrayOfBlocks(block)) {
      rewriteBlocks(block, transformer, write, state);
    } else {
      rewriteBlock(block, transformer, write, state);
    }
  });
}
