import Document = AsciiDoctorJs.Document;
import Preprocessor = AsciiDoctorJs.Preprocessor;
import PreproccesorReader = AsciiDoctorJs.Reader;

// NOTE: this preprocessor attempts to strip out any ifeval, ifdef, ifndef and
// endif directives using a bunch of regular expressions. This is not a proper
// parser so there may be edge cases where this will fail.

const replacements = [
  {
    regex: /^ifeval::/,
    substitute: (match: RegExpMatchArray) => null,
  },
  {
    regex: /^ifn?def::[^\[]+\[(.*)\]$/,
    substitute: (match: RegExpMatchArray) => {
      return match[1] !== '' ? match[1] : null;
    },
  },
  {
    regex: /^endif::/,
    substitute: (match: RegExpMatchArray) => null,
  },
];

export function preprocessor(this: Preprocessor) {
  this.process((document: Document, reader: PreproccesorReader) => {
    const lines = reader.lines;
    const preprocessedLines: string[] = [];
    for (let idx = 0; idx < lines.length; ++idx) {
      const line = lines[idx];
      let preprocessedLine: string | null = line;
      for (const replacement of replacements) {
        const match = line.match(replacement.regex);
        if (match) {
          preprocessedLine = replacement.substitute(match);
          break;
        }
      }
      if (null !== preprocessedLine) {
        preprocessedLines.push(preprocessedLine);
      }
    }
    reader.lines = preprocessedLines;
    return reader;
  });
}
