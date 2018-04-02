import { Extraction } from './extract';

export function blacklist(extractions: Extraction[],
                          blacklistRegexes: RegExp[]): Extraction[] {
  return extractions.map((extraction) => {
    const lines = extraction.text.split('\n');
    const filteredLines = lines.filter((line) => {
      return blacklistRegexes.every(r => !r.test(line));
    });
    return {
      text: filteredLines.join('\n'),
    };
  }).filter((extraction) => '' !== extraction.text);
}
