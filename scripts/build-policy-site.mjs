// Build the public policy site: docs/privacy-policy.md -> index.html and
// docs/support.md -> support.html (the App Store listing's Support URL).
//
// Runs in two halves so the Markdown renderer can stay out of the repo: the
// workflow calls `prepare`, pipes the results through `npx marked`, then calls
// `wrap`. Nothing is added to package.json, and the app's node_modules and its
// patch-package postinstall are never touched by a docs build.
//
// The placeholder check is the point of the `prepare` half. A privacy policy
// that still reads "[CONTACT EMAIL]" must never reach a public URL, least of
// all one handed to App Review, so an unfilled placeholder fails the build
// instead of publishing.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const SOURCE = 'docs/privacy-policy.md';
const TEMPLATE = 'docs/template.html';
const PLACEHOLDERS = ['[LEGAL ENTITY NAME]', '[CONTACT EMAIL]'];

const [command, argument] = process.argv.slice(2);

if (command === 'prepare') {
  const markdown = readFileSync(SOURCE, 'utf8');

  const unfilled = PLACEHOLDERS.filter((p) => markdown.includes(p));
  if (unfilled.length) {
    console.error(`\nRefusing to publish ${SOURCE}.\n`);
    console.error(`Still unfilled: ${unfilled.join(', ')}`);
    console.error('\nEdit the file, replace them with your real details, then push again.\n');
    process.exit(1);
  }

  // Safety net: if the placeholders are filled in but the TODO block was left
  // behind, drop it rather than publish an internal note.
  const cleaned = markdown.replace(
    /> ## TODO before publishing[\s\S]*?Delete this whole block once both are filled in\.\n/,
    '',
  );

  writeFileSync(argument, cleaned);
  console.log(`Prepared ${argument}, no unfilled placeholders.`);
} else if (command === 'wrap') {
  const supportArgument = process.argv[4];
  if (!supportArgument) {
    console.error('wrap needs both bodies: wrap <policy-body.html> <support-body.html>');
    process.exit(1);
  }

  const template = readFileSync(TEMPLATE, 'utf8');
  const page = (bodyPath, title, description) => {
    // Tables get a scroll container so a narrow phone scrolls the table, not
    // the whole page.
    const body = readFileSync(bodyPath, 'utf8')
      .replace(/<table>/g, '<div class="table-wrap"><table>')
      .replace(/<\/table>/g, '</table></div>');
    return template
      .replace('{{TITLE}}', title)
      .replace('{{DESCRIPTION}}', description)
      .replace('{{CONTENT}}', body);
  };

  mkdirSync('_site', { recursive: true });
  writeFileSync('_site/index.html', page(
    argument,
    'Pamwe Privacy Policy',
    'What Pamwe collects, who can see it, and how to erase it.',
  ));
  writeFileSync('_site/support.html', page(
    supportArgument,
    'Pamwe Support',
    'How to get help with Pamwe, and answers to common questions.',
  ));
  console.log('Wrote _site/index.html and _site/support.html');
} else {
  console.error('Usage: build-policy-site.mjs prepare <out.md> | wrap <policy-body.html> <support-body.html>');
  process.exit(1);
}
