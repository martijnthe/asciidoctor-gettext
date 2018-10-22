import Document = AsciiDoctorJs.Document;
import Preprocessor = AsciiDoctorJs.Preprocessor;
import PreproccesorReader = AsciiDoctorJs.Reader;
import AbstractBlock = AsciiDoctorJs.AbstractBlock;
import { RewriteTransformer, Write } from './rewrite';
import Block = AsciiDoctorJs.Block;
import BlockProcessor = AsciiDoctorJs.BlockProcessor;
import IncludeProcessor = AsciiDoctorJs.IncludeProcessor;

// NOTE: The extractPreprocessor attempts to strip out any ifeval, ifdef, ifndef and
// endif directives using a bunch of regular expressions. This is not a proper
// parser so there may be edge cases where this will fail.

// NOTE: The rewritePreprocessor will rewrite all *if*::[] macros to be [if] blocks with
// the parameters of the original if::[] encoded in a JSON string. This way, the if::[]s
// get become nodes in the Document. Finally, getIfBlockRewriter() will rewrite the
// [if] blocks back into (localized) if::[]s... It's a hacky abuse of the API, but
// unfortunately asciidoctor.js doesn't provide a real AST that reflects the input
// completely (if::[]s are gone in the final tree).

const ifBlockName = 'if';

type IfDataType = 'ifeval' | 'ifdef' | 'ifndef' | 'endif' | 'include';

interface IfData {
  type: IfDataType;
  def: string;
  conditionOrContent: string;
}

function getBlockLines(type: IfDataType, conditionOrContent: string = '', def: string = ''): string[] {
  const data: IfData = {
    type,
    conditionOrContent: conditionOrContent,
    def,
  };
  return [`[${ifBlockName}]`, JSON.stringify(data), ''];
}

const replacements = [
  {
    regex: /^ifeval::\[([^\]]+)\]$/,
    extractSubstitute: (match: RegExpMatchArray) => null,
    rewriteSubstitute: (match: RegExpMatchArray) => getBlockLines('ifeval', match[1]),
  },
  {
    regex: /^(ifn?def)::([^\[]+)\[(.*)\]$/,
    extractSubstitute: (match: RegExpMatchArray) => {
      return match[3] !== '' ? [match[3]] : null;
    },
    rewriteSubstitute: (match: RegExpMatchArray) => getBlockLines(match[1] as 'ifdef' | 'ifndef', match[3], match[2]),
  },
  {
    regex: /^endif::/,
    extractSubstitute: (match: RegExpMatchArray) => null,
    rewriteSubstitute: (match: RegExpMatchArray) => getBlockLines('endif'),
  },
];

function makePreprocessor(type: 'extract' | 'rewrite') {
  return function extractPreprocessor(this: Preprocessor) {
    this.process((document: Document, reader: PreproccesorReader) => {
      const lines = reader.lines;
      const preprocessedLines: string[] = [];
      for (let idx = 0; idx < lines.length; ++idx) {
        const line = lines[idx];
        let preprocessedLine: string[] | null = [line];
        for (const replacement of replacements) {
          const match = line.match(replacement.regex);
          if (match) {
            const substitute = type === 'extract' ? replacement.extractSubstitute : replacement.rewriteSubstitute;
            preprocessedLine = substitute(match);
            break;
          }
        }
        if (null !== preprocessedLine) {
          preprocessedLines.push(...preprocessedLine);
        }
      }
      reader.lines = preprocessedLines;
      return reader;
    });
  };
}

export const extractPreprocessor = makePreprocessor('extract');
export const rewritePreprocessor = makePreprocessor('rewrite');

export function ifBlockProcessor(this: BlockProcessor) {
  const self = this;
  self.named(ifBlockName);
  self.process((parent, reader) => {
    const lines = reader.getLines();
    return self.createBlock(parent, ifBlockName, lines);
  });
}

export function getIfBlockRewriter(block: AbstractBlock, transformer: RewriteTransformer, write: Write) {
  return {
    open: () => {
      const ifBlock = block as Block;
      const data: IfData = JSON.parse(ifBlock.getSource()) as IfData;
      const shouldLocalize = ['ifdef', 'ifndef'].includes(data.type);
      const conditionOrContent = shouldLocalize ? transformer(data.conditionOrContent) : data.conditionOrContent;
      write(`${data.type}::${data.def}[${conditionOrContent}]\n`);
    },
  };
}

export function rewriteIncludeProcessor(this: IncludeProcessor) {
  this.process((document, reader, target, attributes) => {
    const lines = getBlockLines('include', '', target);
    reader.pushInclude(lines, target, target, 1, attributes);
  });
  this.handles((target) => {
    return true;
  });
}
