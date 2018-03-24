declare module 'gettext-parser' {
  export type HeaderKeys =
    'project-id-version' |
    'report-msgid-bugs-to' |
    'pot-creation-date' |
    'po-revision-date' |
    'last-translator' |
    'language-team' |
    'language' |
    'mime-version' |
    'content-type' |
    'content-transfer-encoding' |
    'x-generator';

  export interface TranslationContext {
    [msgid: string]: TranslationEntry;
  }

  export interface Translations {
    [msgctxt: string]: TranslationContext;
  }

  export interface TranslationEntry {
    msgid: string;
    msgid_plural?: string;
    comments?: {
      // NOTE: If there are multiple comments of the same type, gettext-parser
      // just concatenated them, separated by a \n ... :-S
      extracted?: string;
      flag?: string;
      previous?: string;
      reference?: string;
      translator?: string;
    };
    msgstr: string[];
  }

  export interface TranslationObject {
    charset: string;
    headers: {
      [key in HeaderKeys]?: string;
    }
    translations: Translations;
  }

  export const po: {
    parse(input: Buffer): TranslationObject;
    compile(obj: TranslationObject): Buffer;
  }
}
