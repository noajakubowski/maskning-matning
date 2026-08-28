#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { genereraHog } = require('../generator/index.js');
const { valjMallar } = require('../generator/mallar.js');
const { skapaSlump } = require('../generator/slump.js');

const repo = path.resolve(__dirname, '..');
const MAX_BYTE = 3 * 1024 * 1024;

function lasFro(fil) {
  const text = fs.readFileSync(fil, 'utf8');
  const m = text.match(/^\s*frö\s+(\S+)\s*$/m);
  if (!m) {
    console.error('AVBRYT: kunde inte läsa frö ur ' + fil);
    process.exit(1);
  }
  return m[1];
}

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

function facitPerDok(facit) {
  const m = new Map();
  for (const p of facit) {
    const id = p['dokument-id'];
    if (!m.has(id)) m.set(id, []);
    m.get(id).push(p);
  }
  return m;
}

function samlaHog(hogtyp, hog) {
  const per = facitPerDok(hog.facit);
  return hog.dokument.map((dok) => ({
    hog: hogtyp,
    id: dok.id,
    typ: dok.typ,
    text: dok.text,
    facit: per.get(dok.id) || [],
  }));
}

function main() {
  const fro = lasFro(path.join(repo, 'docs/fro.md'));
  const namnpoolPath = path.join(repo, 'generator/namn/namnpool.json');
  if (!fs.existsSync(namnpoolPath)) {
    console.error('AVBRYT: saknar ' + namnpoolPath);
    process.exit(1);
  }
  const namnpool = JSON.parse(fs.readFileSync(namnpoolPath, 'utf8'));
  const kollisionsord = lasKollisionsord(path.join(repo, 'generator/kollisionslista.md'));
  const mallar = valjMallar(skapaSlump(fro));

  const hog1 = genereraHog({ seed: fro, hogtyp: 1, namnpool, kollisionsord: [], mallar });
  const hog2 = genereraHog({ seed: fro, hogtyp: 2, namnpool, kollisionsord: [], mallar });
  const hog3 = genereraHog({ seed: fro, hogtyp: 3, namnpool, kollisionsord, mallar });

  // Väljer man ut några få dokument kan en läsare misstänka att de valdes
  // för att de såg bra ut. Ligger hela korpusen där finns inget urval att
  // ifrågasätta.
  const dokument = []
    .concat(samlaHog(1, hog1))
    .concat(samlaHog(2, hog2))
    .concat(samlaHog(3, hog3));

  const data = { fro, dokument };
  const kropp =
    'var DEMODATA = ' +
    JSON.stringify(data) +
    ';\n' +
    'if (typeof globalThis !== \'undefined\') globalThis.DEMODATA = DEMODATA;\n' +
    'if (typeof module !== \'undefined\' && module.exports) module.exports = DEMODATA;\n';

  const storlek = Buffer.byteLength(kropp, 'utf8');
  if (storlek > MAX_BYTE) {
    console.error('AVBRYT: data.js skulle bli ' + storlek + ' byte (gräns 3 MB). Skrev inte filen.');
    process.exit(1);
  }

  const ut = path.join(repo, 'demo/data.js');
  fs.writeFileSync(ut, kropp, 'utf8');

  function rapport(hogtyp, hog) {
    console.log(
      'hög ' + hogtyp + ': ' + hog.dokument.length + ' dokument, ' + hog.facit.length + ' facitposter',
    );
  }
  console.log('frö: ' + fro);
  rapport(1, hog1);
  rapport(2, hog2);
  rapport(3, hog3);
  console.log('dokument totalt: ' + dokument.length);
  console.log('filstorlek: ' + storlek + ' byte');
  console.log('ut: ' + ut);
}

main();
