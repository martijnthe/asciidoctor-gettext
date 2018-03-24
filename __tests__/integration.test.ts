import { spawnSync } from 'child_process';
import * as path from 'path';
import * as tmp from 'tmp';
import { readFileSync } from 'fs';

function run(args: string[]= []) {
  const ret = spawnSync(
    path.join(__dirname, '..', 'bin', 'asciidoctor-gettext.js'),
    args,
    {
      encoding: 'utf8',
    });
  return ret;
}

const fixture = path.join(__dirname, 'fixture.adoc');

describe('asciidoctor-gettext', () => {
  it('prints help when no arguments are given', () => {
    const ret = run();
    expect(ret.status).toEqual(0);
    expect(ret.stdout).toMatch('Usage: asciidoctor-gettext');
  });

  describe('gettextize', () => {
    it('prints help when no arguments are given', function() {
      const ret = run(['gettextize']);
      expect(ret.status).toEqual(0);
      expect(ret.stdout).toMatch(
        'Extracts texts from asciidoc file and generates a .pot file');
    });
    it('extracts to stdout when no -p is given', () => {
      const ret = run(['gettextize', '-m', fixture]);
      expect(ret.status).toEqual(0);
      expect(ret.stdout).toMatch('msgid');
    });
    it('extracts to file when -p is given', () => {
      const temp = tmp.fileSync();
      const ret = run(['gettextize', '-m', fixture, '-p', temp.name]);
      expect(ret.status).toEqual(0);
      expect(ret.stdout).not.toMatch('msgid');
      const pot = readFileSync(temp.name, { encoding: 'utf8' });
      expect(pot).toMatch('msgid');
    });
    it('accepts --package-name and --package-version', () => {
      const ret = run([
        'gettextize', '-m', fixture,
        '--package-name', 'my-pkg', '--package-version', '2.0',
      ]);
      expect(ret.status).toEqual(0);
      expect(ret.stdout).toMatch('Project-Id-Version: my-pkg 2.0');
    });
    it('accepts --bugs-email-address', () => {
      const ret = run([
        'gettextize', '-m', fixture,
        '--bugs-email-address', 'post@martijnthe.nl',
      ]);
      expect(ret.status).toEqual(0);
      expect(ret.stdout).toMatch('Report-Msgid-Bugs-To: post@martijnthe.nl');
    });
    it('avoids extracting builtin attributes', () => {
      const ret = run([
        'gettextize', '-m', fixture, '--no-builtin-attrs',
      ]);
      expect(ret.status).toEqual(0);
      expect(ret.stdout).not.toMatch('Table of Contents');
    });
  });
});
