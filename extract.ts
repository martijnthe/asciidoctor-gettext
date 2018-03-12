import {
  allBuiltinsAttributeKeys,
  nonLocalizableBuiltinAttributeKeys
} from './attributes';
import AbstractBlock = AsciiDoctorJs.AbstractBlock;
import Block = AsciiDoctorJs.Block;
import Cell = AsciiDoctorJs.Cell;
import Document = AsciiDoctorJs.Document;
import Image = AsciiDoctorJs.Image;
import ImageAttributes = AsciiDoctorJs.ImageAttributes;
import Section = AsciiDoctorJs.Section;
import Table = AsciiDoctorJs.Table;

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

export function extract(block: AbstractBlock, options: ExtractOptions={}): Extraction[] {
  const ignore = (block: AbstractBlock) => [];

  const extractMap: ExtractMap = {
    dlist: (block) => {
      return [];
    },
    document: (block) => {
      const document = block as Document;
      const attributes = document.getAttributes();
      const attributeFilter = options.attributeFilter || defaultAttributeFilter;
      const extractions = Object.keys(attributes).filter(attributeFilter).map(key => {
        return {
          text: attributes[key],
        };
      });
      return extractions;
    },
    image: (block) => {
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
    toc: ignore,
  };

  const extraction = (() => {
    const extract = extractMap[block.node_name];
    if (!extract) {
      console.error(`Unknown node name: '${block.node_name}'`);
      return [];
    }
    return extract(block);
  })();

  const childExtractions = extractBlocks(block.blocks, options={});

  return extraction.concat(childExtractions);
}

export function extractBlocks(blocks: AbstractBlock[], options?: ExtractOptions): Extraction[] {
  return blocks.reduce((extractions: Extraction[], block: AbstractBlock) => {
    return extractions.concat(extract(block, options));
  }, []);
}
