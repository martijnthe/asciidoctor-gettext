declare namespace AsciiDoctorJs {
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
  }

  export interface Block extends AbstractBlock {
    getSource(): string;
  }

  export interface Section extends AbstractBlock {
    node_name: 'section';
  }

  export interface Cell extends AbstractNode {
    node_name: 'cell';
    text: string;
  }

  export interface Table extends AbstractBlock {
    node_name: 'table';
    rows: {
      body: Cell[][];
      foot: Cell[][];
      head: Cell[][];
    }
  }

  export interface Attributes {
    [key: string]: string;
  }

  export interface Document extends AbstractBlock {
    node_name: 'document';
    header: Section;
    getAttributes(): Attributes;
  }

  export interface ImageAttributes {
    'default-alt': string;
    alt: string;
    target: string;
  }

  export interface Image extends Block {
    getAttributes(): ImageAttributes;
  }

  export interface ListItem extends AbstractBlock {
    text: string;
  }

  export interface TreeProcessor {
    process(callback: (document: Document) => void): void;
  }

  export interface Registry {
    treeProcessor(callback: (this: TreeProcessor) => void): void;
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
    }
  };
}

declare module 'asciidoctor.js' {
  const factory: () => AsciiDoctorJs.AsciiDoctor;
  export = factory;
}
