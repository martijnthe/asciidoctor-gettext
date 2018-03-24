import { Extraction } from './extract';
import {
  TranslationContext,
  TranslationEntry, TranslationObject,
  Translations,
} from 'gettext-parser';
import { collate } from './collate';

export interface HeaderInfo {
  project?: string;
  projectVersion?: string;
  bugsEmailAddress?: string;
}

export function translationEntryFromExtraction(extraction: Extraction): TranslationEntry {
  return {
    msgid: extraction.text,
    msgstr: [''],
  };
}

export function translationsFromExtractions(extractions: Extraction[]): Translations {
  // For now, only support no/the default context:
  const defaultCtxt = extractions.reduce((ctx: TranslationContext, extraction: Extraction) => {
    const entry = translationEntryFromExtraction(extraction);
    ctx[entry.msgid] = entry;
    return ctx;
  }, {});

  return {
    '': defaultCtxt,
  };
}

export function translationObjectFromExtractions(
  extractions: Extraction[],
  headerInfo: HeaderInfo = {}): TranslationObject {
  const collated = collate(extractions);
  const project = headerInfo.project || 'untitled';
  const projectVersion = headerInfo.projectVersion || '1.0';
  const headers: TranslationObject['headers'] = {
    'project-id-version': `${project} ${projectVersion}`,
    'language': '',
    'mime-version': '1.0',
    'content-type': 'text/plain; charset=UTF-8',
    'content-transfer-encoding': '8bit',
    'x-generator': 'asciidoctor-gettext',
  };
  if (headerInfo.bugsEmailAddress && headerInfo.bugsEmailAddress.length > 0) {
    headers['report-msgid-bugs-to'] = headerInfo.bugsEmailAddress;
  }
  return {
    charset: 'utf-8',
    headers,
    translations: translationsFromExtractions(collated),
  };
}
