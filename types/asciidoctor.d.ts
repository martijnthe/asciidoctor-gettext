declare namespace AsciiDoctorJs {
  export interface Parser {

  }

  export interface AbstractNode {
    node_name: string;
  }

  export interface AbstractBlock extends AbstractNode {
    blocks: AbstractBlock[];
  }

  export interface Block extends AbstractBlock {
    lines: string[];
  }

  export interface Section extends AbstractBlock {
    node_name: 'section';
    title: string;
  }

  export interface Cell extends AbstractNode {
    node_name: 'cell';
    text: string;
  }

  export interface Table extends AbstractBlock {
    node_name: 'table';
    title: string;
    rows: {
      body: Cell[][];
      foot: Cell[][];
      head: Cell[][];
    }
  }

  export interface Document extends AbstractBlock {
    node_name: 'document';
    header: Section;
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
