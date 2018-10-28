import {
  allBuiltinsAttributeKeys,
  nonLocalizableBuiltinAttributeKeys,
} from './attributes';
import {
  isNil,
} from './opal-utils';
import AbstractBlock = AsciiDoctorJs.AbstractBlock;
import Block = AsciiDoctorJs.Block;
import Cell = AsciiDoctorJs.Cell;
import Document = AsciiDoctorJs.Document;
import Image = AsciiDoctorJs.Image;
import ImageAttributes = AsciiDoctorJs.ImageAttributes;
import ListItem = AsciiDoctorJs.ListItem;
import Table = AsciiDoctorJs.Table;
import { isArrayOfBlocks } from './common';
import { extractPreprocessor } from './conditionals';
import Options = AsciiDoctorJs.Options;
import AsciiDoctorFactory from 'asciidoctor.js';

export interface Extraction {
  text: string;
}

type ExtractFunction = (block: AbstractBlock) => Extraction[];

interface ExtractMap {
  [key: string]: ExtractFunction;
}

export interface ExtractOptions {
  attributeFilter?: (key: string) => boolean;
}

export function defaultAttributeFilter(key: string) {
  return (-1 === nonLocalizableBuiltinAttributeKeys.indexOf(key));
}

export function allBuiltinsAttributeFilter(key: string) {
  return (-1 === allBuiltinsAttributeKeys.indexOf(key));
}

function extend(base: ExtractFunction, sub: ExtractFunction): ExtractFunction {
  return (block: AbstractBlock) => [
    ...base(block),
    ...sub(block),
  ];
}

function extractAbstractBlock(block: AbstractBlock): Extraction[] {
  const extractions: Extraction[] = [];
  const title = block.title;
  if (!isNil(title) && title !== '') {
    extractions.push({
      text: title,
    });
  }
  return extractions;
}

const extractVerbatimBlock = extend(extractAbstractBlock, (block) => {
  const literal = block as Block;
  return [{
    text: literal.getSource(),
  }];
});

function load(input: string, isPath: boolean, options: Options): AbstractBlock {
  const asciidoctor = AsciiDoctorFactory();
  asciidoctor.Extensions.register('extract', function() {
    this.preprocessor(extractPreprocessor);
  });
  const document = isPath ? asciidoctor.loadFile(input, options) : asciidoctor.load(input, options);
  asciidoctor.Extensions.unregister(['extract']);
  return document;
}

export function extract(input: string, extractOptions: ExtractOptions= {},
                        asciidocOptions: Options = {}): Extraction[] {
  const document = load(input, false, asciidocOptions);
  return extractBlock(document, extractOptions);
}

export function extractFile(path: string, extractOptions: ExtractOptions= {},
                            asciidocOptions: Options = {}): Extraction[] {
  const document = load(path, true, asciidocOptions);
  return extractBlock(document, extractOptions);
}

export function extractBlock(block: AbstractBlock, options: ExtractOptions= {}): Extraction[] {
  const ignore = (block: AbstractBlock) => [];

  const extractMap: ExtractMap = {
    admonition: extractAbstractBlock,
    dlist: extractAbstractBlock,
    document: (block) => {
      const document = block as Document;
      const attributes = document.getAttributes();
      const attributeFilter = options.attributeFilter || defaultAttributeFilter;
      const extractions = Object.keys(attributes).filter(attributeFilter).map(key => {
        return {
          text: attributes[key] as string,
        };
      });
      return extractions;
    },
    floating_title: extractAbstractBlock,
    image: extend(extractAbstractBlock, (block) => {
      const image = block as Image;
      const attributes = image.getAttributes();
      // Add the target file name to the localizable strings. This is useful
      // in case alternative image files need to be provided.
      const extractions = [{
        text: attributes.target,
      }];
      const altKeys: (keyof ImageAttributes)[] = ['alt', 'default-alt'];
      altKeys.forEach((key) => {
        // Only if the alt attributes are not just the base of the target file
        // name add them to the extractions:
        if (attributes[key] && attributes.target.substr(0, attributes[key].length) !== attributes[key]) {
          extractions.push({
            text: attributes[key],
          });
        }
      });
      return extractions;
    }),
    list_item: (block) => {
      const li = block as ListItem;
      const text = li.text;
      if (isNil(text) || text === '') {
        return [];
      }
      return [{
        text,
      }];
    },
    listing: extractVerbatimBlock,
    literal: extractVerbatimBlock,
    olist: extractAbstractBlock,
    page_break: ignore,
    paragraph: extend(extractAbstractBlock, (block) => {
      const paragraphBlock = block as Block;
      return [{
        text: paragraphBlock.getSource(),
      }];
    }),
    preamble: extractAbstractBlock,
    quote: extractAbstractBlock,
    section: extractAbstractBlock,
    sidebar: extractAbstractBlock,
    table: extend(extractAbstractBlock, (block) => {
      const table = block as Table;
      const rowsKeys: (keyof Table['rows'])[] = ['head', 'body', 'foot'];
      return rowsKeys.reduce((extractions, key) => {
        return extractions.concat(table.rows[key].reduce((extractions, cells: Cell[]) => {
          return extractions.concat(cells.map((cell: Cell) => {
            return {
              text: cell.text,
            };
          }));
        }, [] as Extraction[]));
      }, [] as Extraction[]);
    }),
    thematic_break: ignore,
    toc: ignore,
    ulist: extractAbstractBlock,
    verse: extractVerbatimBlock,
  };

  const extraction = (() => {
    const extractFn = extractMap[block.node_name];
    if (!extractFn) {
      console.error(`Unknown node name: '${block.node_name}'`);
      return [];
    }
    return extractFn(block);
  })();

  const childExtractions = extractBlocks(block.getBlocks(), options = {});

  return extraction.concat(childExtractions);
}

export function extractBlocks(blocks: Array<AbstractBlock | AbstractBlock[]>,
                              options?: ExtractOptions): Extraction[] {
  return blocks.reduce((extractions: Extraction[], block: AbstractBlock | AbstractBlock[]) => {
    // Oddly, the blocks of a dlist are arrays of arrays of blocks...
    if (isArrayOfBlocks(block)) {
      return extractions.concat(extractBlocks(block, options));
    }
    return extractions.concat(extractBlock(block, options));
  }, []);
}
