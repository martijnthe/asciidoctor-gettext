import Document = AsciiDoctorJs.Document;
import Preprocessor = AsciiDoctorJs.Preprocessor;
import PreproccesorReader = AsciiDoctorJs.Reader;
import { RewriteTransformer, Write } from './rewrite';
import Block = AsciiDoctorJs.Block;
import IncludeProcessor = AsciiDoctorJs.IncludeProcessor;

// NOTE: The extractPreprocessor attempts to strip out any ifeval, ifdef, ifndef and
// endif directives using a bunch of regular expressions. This is not a proper
// parser so there may be edge cases where this will fail.

// NOTE: The rewritePreprocessor will rewrite all *if*::[] macros to be pass-through blocks
// with a "magic" role assigned to it. the parameters of the original if::[] encoded in
// a JSON string, which is put into the pass-through text. This way, the if::[]s
// get become nodes in the Document. Finally, ifBlockRewriterOpen() will rewrite the
// pass-through blocks back into (localized) if::[]s... It's a hacky abuse of the API, but
// unfortunately asciidoctor.js doesn't provide a real AST that reflects the input
// completely (if::[]s are gone in the final tree).

// NOTE: This hack is also used for include::[] macros. The reason is to enable "assigning"
// id's and title's and attributes to a block that gets included through a macro. By
// using a pass-through block to represent the include:[], asciidoctor's parser will assign the
// id, title and attributes to the generated block.

const ifBlockRole = '__asciiDoctorGettextIfBlockHack__';

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
  return [`[pass, role="${ifBlockRole}"]`, JSON.stringify(data), ''];
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
  {
    regex: /^include::([^\[]+)\[\]$/,
    extractSubstitute: (match: RegExpMatchArray) => null,
    rewriteSubstitute: (match: RegExpMatchArray) => getBlockLines('include', '', match[1]),
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

function macroSourceFromIfData(jsonString: string, transformer: RewriteTransformer) {
  const data: IfData = JSON.parse(jsonString) as IfData;
  const shouldLocalize = ['ifdef', 'ifndef'].includes(data.type);
  const conditionOrContent = shouldLocalize ? transformer(data.conditionOrContent) : data.conditionOrContent;
  return `\n${data.type}::${data.def}[${conditionOrContent}]\n\n`;
}

export function ifBlockRewriterOpen(ifBlock: Block, transformer: RewriteTransformer, write: Write) {
  if (ifBlock.getRole() !== ifBlockRole) {
    return false;
  }
  const macroSource = macroSourceFromIfData(ifBlock.getSource(), transformer);
  write(macroSource);
  return true;
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

export function ifBlockRewriteCellText(text: string, writeCellContent: (text: string) => void, write: Write,
                                       transformer: RewriteTransformer): void {
  const filterRegEx = /\[pass, role="__asciiDoctorGettextIfBlockHack__"\]\n([^\n]+)/g;
  let cursor = 0;
  while (true) {
    const matches = filterRegEx.exec(text);
    if (matches === null) {
      writeCellContent(text.substr(cursor, text.length));
      return;
    }
    const matchStart = filterRegEx.lastIndex - matches[0].length;
    if (cursor < filterRegEx.lastIndex) {
      writeCellContent(text.substring(cursor, matchStart));
    }
    write(macroSourceFromIfData(matches[1], transformer));
    cursor = filterRegEx.lastIndex;
  }
}
