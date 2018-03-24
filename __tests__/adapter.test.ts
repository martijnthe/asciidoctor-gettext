import {
  translationEntryFromExtraction, translationObjectFromExtractions,
  translationsFromExtractions,
} from '../adapter';

describe('adapter', () => {
  describe('translationEntryFromExtraction()', () => {
    it('works', () => {
      expect(translationEntryFromExtraction({
        text: 'hullo',
      })).toEqual({
        msgid: 'hullo',
        msgstr: [''],
      });
    });
  });

  const extractions = [
    { text: 'bilaa' },
    { text: 'boom' },
  ];

  const expectedTranslations = {
    '': {
      'bilaa': {
        msgid: 'bilaa',
        msgstr: [''],
      },
      'boom': {
        msgid: 'boom',
        msgstr: [''],
      },
    },
  };

  describe('translationsFromExtractions()', () => {
    it('works', function() {
      expect(translationsFromExtractions(extractions)).toEqual(expectedTranslations);
    });
  });

  describe('translationObjectFromExtractions()', () => {
    it('works without headerInfo', function() {
      expect(translationObjectFromExtractions(extractions)).toEqual({
        charset: 'utf-8',
        headers: {
          'project-id-version': 'untitled 1.0',
          'language': '',
          'mime-version': '1.0',
          'content-type': 'text/plain; charset=UTF-8',
          'content-transfer-encoding': '8bit',
          'x-generator': 'asciidoctor-gettext',
        },
        translations: expectedTranslations,
      });
    });
  });
});
