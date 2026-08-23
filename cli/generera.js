#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { genereraHog } = require('../generator/index.js');
const { valjMallar } = require('../generator/mallar.js');
const { skapaSlump } = require('../generator/slump.js');

function lasKollisionsord(fil) {
  const text = fs.readFileSync(fil, 'utf8');
  const ord = [];
  for (const rad of text.split('\n')) {
    const m = rad.match(/^\| ([^|]+) \|/);
    if (!m) continue;
    const o = m[1].trim();
    if (o === 'Ord' || o.startsWith('---')) continue;
    ord.push({ ord: o });
  }
  return ord;
}

function usage() {
  console.error('Användning: node cli/generera.js <frö> <högtyp>');
  console.error('  högtyp: 1 | 2 | 3');
  process.exit(2);
}

function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) usage();
  const seed = args[0];
  const hogtyp = parseInt(args[1], 10);
  if (![1, 2, 3].includes(hogtyp)) usage();

  const repo = path.resolve(__dirname, '..');
  const namnpoolPath = path.join(repo, 'generator/namn/namnpool.json');
  const kollPath = path.join(repo, 'generator/kollisionslista.md');

  if (!fs.existsSync(namnpoolPath)) {
    console.error(`Saknar ${namnpoolPath}. Kör verktyg/dela-namnregister.js först.`);
    process.exit(1);
  }

  const namnpool = JSON.parse(fs.readFileSync(namnpoolPath, 'utf8'));
  const kollisionsord = hogtyp === 3 ? lasKollisionsord(kollPath) : [];
  const mallar = valjMallar(skapaSlump(seed));

  const resultat = genereraHog({
    seed,
    hogtyp,
    namnpool,
    kollisionsord,
    mallar,
  });

  const utDir = path.join(repo, 'arbetsyta', `hog${hogtyp}-${seed}`);
  fs.mkdirSync(utDir, { recursive: true });

  resultat.dokument.forEach((dok) => {
    fs.writeFileSync(path.join(utDir, `${dok.id}.txt`), dok.text, 'utf8');
  });
  fs.writeFileSync(
    path.join(utDir, 'facit.json'),
    JSON.stringify({ seed, hogtyp, meta: resultat.meta, poster: resultat.facit }, null, 2) + '\n',
    'utf8',
  );

  console.log(`Frö: ${seed}`);
  console.log(`Hög: ${hogtyp}`);
  console.log(`Dokument: ${resultat.meta.antalDokument}`);
  console.log(`Facitposter: ${resultat.meta.antalFacit}`);
  console.log(`Ut: ${utDir}`);
}

main();
