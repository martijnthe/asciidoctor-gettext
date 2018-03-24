import { Extraction } from './extract';

export function collate(extractions: Extraction[]): Extraction[] {
  const map: {
    [text: string]: Extraction | undefined;
  } = {};
  return extractions.reduce((rv: Extraction[], extraction: Extraction) => {
    const existing = map[extraction.text];
    if (existing === undefined) {
      map[extraction.text] = extraction;
      rv.push(extraction);
    }
    return rv;
  }, []);
}
