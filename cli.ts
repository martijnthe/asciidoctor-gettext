import WriteStream = NodeJS.WriteStream;
import { asciidoctor } from './singleton';
import { Command } from 'commander';
import { allBuiltinsAttributeFilter, extract } from './extract';
import { po } from 'gettext-parser';
import { translationObjectFromExtractions } from './adapter';
import { writeFileSync } from 'fs';

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

export function gettextizeAction(program: Command) {
  if (!program.master) {
    program.help();
    return;
  }

  const document = asciidoctor.loadFile(program.master, {});
  const extractions = extract(document, {
    attributeFilter: program.builtinAttrs ? undefined : allBuiltinsAttributeFilter,
  });
  const blacklistRegexes = getBlacklistRegexes(program);
  const translationObject = translationObjectFromExtractions(extractions, {
    project: program.packageName,
    projectVersion: program.packageVersion,
    bugsEmailAddress: program.bugsEmailAddress,
  }, blacklistRegexes);
  const poBuffer = po.compile(translationObject);
  if (program.po) {
    writeFileSync(program.po, poBuffer, { encoding: 'utf8' });
  } else {
    process.stdout.write(poBuffer);
  }
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

  program.parse(argv);

  if (program.args.length === 0) {
    program.help();
    return;
  }
}
