#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { detekteraHog } = require('../detektor/index.js');

function usage() {
  console.error('Användning: node cli/detektera.js <högkatalog>');
  process.exit(2);
}

function tolkaHogKatalog(katalog) {
  const namn = path.basename(katalog);
  const m = namn.match(/^hog([123])-(.+)$/);
  if (!m) return null;
  return { hogtyp: parseInt(m[1], 10), seed: m[2] };
}

function lasDokument(katalog) {
  const dokument = [];
  for (const fil of fs.readdirSync(katalog).sort()) {
    if (!fil.endsWith('.txt')) continue;
    const id = fil.replace(/\.txt$/, '');
    const text = fs.readFileSync(path.join(katalog, fil), 'utf8');
    dokument.push({ id, text });
  }
  return dokument;
}

function skrivFlaggor(katalog, filnamn, seed, hogtyp, flaggor) {
  const data = {
    seed,
    hogtyp,
    meta: { antalFlaggor: flaggor.length },
    flaggor,
  };
  fs.writeFileSync(
    path.join(katalog, filnamn),
    JSON.stringify(data, null, 2) + '\n',
    'utf8',
  );
}

function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) usage();

  const hogKatalog = path.resolve(args[0]);
  if (!fs.existsSync(hogKatalog) || !fs.statSync(hogKatalog).isDirectory()) {
    console.error(`Saknar högkatalog: ${hogKatalog}`);
    process.exit(1);
  }

  const meta = tolkaHogKatalog(hogKatalog);
  if (!meta) {
    console.error('Högkatalogen ska heta hog{N}-{frö}');
    process.exit(1);
  }

  const repo = path.resolve(__dirname, '..');
  const lexikonPath = path.join(repo, 'detektor/namn/lexikon.json');
  if (!fs.existsSync(lexikonPath)) {
    console.error(`Saknar ${lexikonPath}. Kör verktyg/dela-namnregister.js först.`);
    process.exit(1);
  }

  const lexikon = JSON.parse(fs.readFileSync(lexikonPath, 'utf8'));
  const dokument = lasDokument(hogKatalog);
  const { monster, lexikon: lexFlaggor } = detekteraHog(dokument, lexikon);

  skrivFlaggor(hogKatalog, 'flaggor-monster.json', meta.seed, meta.hogtyp, monster);
  skrivFlaggor(hogKatalog, 'flaggor-lexikon.json', meta.seed, meta.hogtyp, lexFlaggor);

  console.log(`Frö: ${meta.seed}`);
  console.log(`Hög: ${meta.hogtyp}`);
  console.log(`Dokument: ${dokument.length}`);
  console.log(`Flaggor mönster: ${monster.length}`);
  console.log(`Flaggor lexikon: ${lexFlaggor.length}`);
  console.log(`Ut: ${hogKatalog}`);
}

main();
