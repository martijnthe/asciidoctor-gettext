import WriteStream = NodeJS.WriteStream;
import { Command } from 'commander';
import { allBuiltinsAttributeFilter, extractFile } from './extract';
import { po, TranslationEntry } from 'gettext-parser';
import { translationObjectFromExtractions } from './adapter';
import { writeFileSync, readFileSync } from 'fs';
import Attributes = AsciiDoctorJs.Attributes;
import { rewriteFile } from './rewrite';

function getBlacklistRegexes(program: Command) {
  const blacklistRegexes = (program.ignore as string[]).map((pattern) => {
    try {
      return RegExp(pattern);
    } catch (e) {
      if (e instanceof SyntaxError) {
        process.stderr.write(`Error in --ignore regular expression "${pattern}"\n${e.message}`);
        process.exit(1);
      }
      throw e;
    }
  });
  return blacklistRegexes;
}

function getAttributes(program: Command): Attributes {
  return (program.attribute as string[]).reduce((attributes: Attributes, arg) => {
    const splitArg = arg.split('=');
    if (splitArg.length !== 2) {
      process.stderr.write(
        `Error in --attribute "${arg}", format must be "name=value"`);
      process.exit(1);
    }
    const [name, value] = splitArg;
    if (name.length === 0) {
      process.stderr.write(
        `Error in --attribute "${arg}", missing name`);
      process.exit(1);
    }
    attributes[name] = value;
    return attributes;
  }, {});
}

function write(contents: string | Buffer, outputPath?: string) {
  if (outputPath) {
    writeFileSync(outputPath, contents, { encoding: 'utf8' });
  } else {
    process.stdout.write(contents);
  }
}

export function gettextizeAction(program: Command): void {
  if (!program.master) {
    program.help();
    return;
  }

  const extractions = extractFile(program.master, {
    attributeFilter: program.builtinAttrs ? undefined : allBuiltinsAttributeFilter,
  }, {
    attributes: getAttributes(program),
  });
  const blacklistRegexes = getBlacklistRegexes(program);
  const translationObject = translationObjectFromExtractions(extractions, {
    project: program.packageName,
    projectVersion: program.packageVersion,
    bugsEmailAddress: program.bugsEmailAddress,
  }, blacklistRegexes);
  const poBuffer = po.compile(translationObject);
  write(poBuffer, program.po);
}

export function translateAction(program: Command): void {
  if (!program.master || !program.po) {
    program.help();
    return;
  }
  const poBuffer = readFileSync(program.po);
  const translationObject = po.parse(poBuffer);
  const translations = translationObject.translations[''];
  const transformer = (text: string): string => {
    const translationEntry = translations[text];
    if (!translationEntry) {
      return text;
    }
    const msgstr = translationEntry.msgstr[0];
    if (msgstr === '') {
      return text;
    }
    return msgstr;
  };
  const output = rewriteFile(program.master, transformer, {
    attributes: getAttributes(program),
  });
  write(output, program.localized);
}

export function cli(argv: string[], stdout: WriteStream= process.stdout) {
  function collect(val: string, memo: string[]) {
    memo.push(val);
    return memo;
  }

  const program = new Command();
  program
    .description('gettext/po string extraction tool for asciidoc documents');

  program
    .command('gettextize')
    .description('Extracts texts from asciidoc file and generates a .pot file')
    .option('-a, --attribute <name=value>',
      'Define an attribute.', collect, [])
    .option('-m, --master <path>',
      'File containing the master document to translate.')
    .option('-p, --po <path>',
      `File where the message catalog should be written. If not given, \
the message catalog will be written to the standard output.`)
    .option('-i, --ignore <regex>',
      'RegEx pattern of lines that should be ignored.', collect, [])
    .option('--no-builtin-attrs',
      'Do not extract asciidoctor-builtin attributes.', false)
    .option('--package-name <string>',
      'Set the package name for the POT header.', 'PACKAGE')
    .option('--package-version <string>',
      'Set the package version for the POT header.', 'VERSION')
    .option('--bugs-email-address <email>',
      `Set the report address for msgid bugs. By default, the created POT \
files have no Report-Msgid-Bugs-To fields.`, '')
    .action(gettextizeAction);

  program
    .command('translate')
    .description('Writes a new asciidoc file by translating a given asciidoc file and .po file')
    .option('-m, --master <path>',
      'File containing the master document to translate.')
    .option('-a, --attribute <name=value>',
      'Define an attribute.', collect, [])
    .option('-p, --po <path>',
      'File with the message catalog to use to translate the master document.')
    .option('-l, --localized <path>',
      `File where the translated document should be written. If not given, \
the translated document will be written to the standard output.`)
    .action(translateAction);

  program
    .command('*')
    .action(() => {
      program.help();
    });

  program.parse(argv);

  if (program.args.length === 0) {
    program.help();
    return;
  }
}
