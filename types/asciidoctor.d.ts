declare namespace AsciiDoctorJs {
  export interface Reader {
    lines: string[];
    getLines(): string[];
  }

  export interface PreproccesorReader extends Reader {
  }

  export class Preprocessor {
    process(callback: (document: Document, reader: PreproccesorReader) => void): void;
  }

  export interface IncludeProcessorReader extends Reader {
    pushInclude(lines: string[], file: string, path: string, lineno: number, attributes: Attributes): void;
  }

  export class IncludeProcessor {
    handles(callback: (target: string) => boolean): void;
    process(callback: (document: Document, reader: IncludeProcessorReader,
                       target: string, attributes: Attributes) => void): void;
  }

  export class BlockProcessor {
    named(name: string): void;
    process(callback: (parent: AbstractBlock, reader: Reader) => AbstractBlock): void;
    createBlock(parent: AbstractBlock, blockName: string, lines: string[]): AbstractBlock;
  }

  export interface Parser {

  }

  export interface AbstractNode {
    // Using node_name, getNodeName() doesn't seem to exist...?
    node_name: string;
  }

  export interface AbstractBlock extends AbstractNode {
    getBlocks(): AbstractBlock[];
    // Using title, not getTitle() because getTitle() encodes to HTML Entities.
    title: string;
    getAttributes(): Attributes;
  }

  export interface Block extends AbstractBlock {
    getSource(): string;
    getStyle(): string;
  }

  export interface Section extends AbstractBlock {
    node_name: 'section';
    level: number;
  }

  export interface Cell extends AbstractNode {
    node_name: 'cell';
    text: string;
    rowspan?: number;
    colspan?: number;
  }

  export interface Table extends AbstractBlock {
    node_name: 'table';
    caption: string;
    rows: {
      body: Cell[][];
      foot: Cell[][];
      head: Cell[][];
    }
  }

  export interface Attributes {
    [key: string]: string;
  }

  export interface OpalHash {
    $$keys: string[];
  }

  export interface Document extends AbstractBlock {
    node_name: 'document';
    attributes_modified: {
      hash: OpalHash;
    };
    header: Section;
  }

  export interface ImageAttributes {
    'default-alt': string;
    alt: string;
    target: string;
    [key: string]: string;
  }

  export interface Image extends Block {
    getAttributes(): ImageAttributes;
  }

  export interface ListItem extends AbstractBlock {
    level: number;
    parent: AbstractBlock;
    text: string;
  }

  export interface TreeProcessor {
    process(callback: (document: Document) => void): void;
  }

  export interface Registry {
    block(callback: (this: BlockProcessor) => void): void;
    treeProcessor(callback: (this: TreeProcessor) => void): void;
    includeProcessor(callback: (this: IncludeProcessor) => void): void;
    preprocessor(callback: (this: Preprocessor) => void): void;
  }

  export interface Options {
    extension_registry?: Registry,
    attributes?: {
      docdate?: string | boolean;
      doctime?: string | boolean;
    }
  }

  export type AsciiDoctor = {
    convert(inputText: string, options: Options): string;
    convertFile(path: string, options: Options): string;
    load(inputText: string, options: Options): Document;
    loadFile(path: string, options: Options): Document;
    Parser: Parser,
    Extensions: {
      create(): Registry;
      register(callback: (this: Registry) => void): void;
      register(name: string, callback: (this: Registry) => void): void;
      unregister(names: string[]): void;
    }
  };
}

declare module 'asciidoctor.js' {
  const factory: () => AsciiDoctorJs.AsciiDoctor;
  export = factory;
}
