import AbstractBlock = AsciiDoctorJs.AbstractBlock;
import Block = AsciiDoctorJs.Block;
import Cell = AsciiDoctorJs.Cell;
import Document = AsciiDoctorJs.Document;
import Section = AsciiDoctorJs.Section;
import Table = AsciiDoctorJs.Table;

export interface Extraction {
  text: string;
}

type ExtractFunction = (block: AbstractBlock) => Extraction[];

interface ExtractMap {
  [key: string]: ExtractFunction;
}

export function extract(block: AbstractBlock): Extraction[] {
  const ignore = (block: AbstractBlock) => [];

  const extractMap: ExtractMap = {
    document: (block) => {
      const document = block as Document;
      if (!document.header.title) {
        return [];
      }
      return [{
        text: document.header.title,
      }];
    },
    paragraph: (block) => {
      const paragraphBlock = block as Block;
      return [{
        text: paragraphBlock.lines.join('\n'),
      }];
    },
    section: (block) => {
      const section = block as Section;
      return [{
        text: section.title,
      }];
    },
    table: (block) => {
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
    },
    page_break: ignore,
  };

  const extraction = (() => {
    const extract = extractMap[block.node_name];
    if (!extract) {
      console.error(`Unknown node name: '${block.node_name}'`);
      return [];
    }
    return extract(block);
  })();

  const childExtractions = extractBlocks(block.blocks);

  return extraction.concat(childExtractions);
}

export function extractBlocks(blocks: AbstractBlock[]): Extraction[] {
  return blocks.reduce((extractions: Extraction[], block: AbstractBlock) => {
    return extractions.concat(extract(block));
  }, []);
}
