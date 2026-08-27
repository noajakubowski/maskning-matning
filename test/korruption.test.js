#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { SUBSTITUTION, nollstallKorruptionstypByten } = require('../generator/korruption.js');

const repo = path.resolve(__dirname, '..');
let fel = 0;

function fail(msg) {
  console.error(`BRIST: ${msg}`);
  fel++;
}

function lasTestData() {
  const namnpoolPath = path.join(repo, 'generator/namn/namnpool.json');
  if (!fs.existsSync(namnpoolPath)) {
    fail('Saknar namnpool.json');
    return null;
  }
  const { genereraHog } = require(path.join(repo, 'generator/index.js'));
  const { valjMallar } = require(path.join(repo, 'generator/mallar.js'));
  const { skapaSlump } = require(path.join(repo, 'generator/slump.js'));
  const namnpool = JSON.parse(fs.readFileSync(namnpoolPath, 'utf8'));
  const koll = fs.readFileSync(path.join(repo, 'generator/kollisionslista.md'), 'utf8')
    .split('\n')
    .filter((l) => /^\| [A-ZÅÄÖ]/.test(l))
    .map((l) => ({ ord: l.split('|')[1].trim() }));
  const mallar = valjMallar(skapaSlump('korruption-test'));
  return { genereraHog, namnpool, kollisionsord: koll, mallar };
}

function matcharSubstitutionPar(orig, skadad) {
  const o = [...orig];
  const s = [...skadad];
  if (o.length !== s.length) return false;
  let pos = -1;
  for (let i = 0; i < o.length; i++) {
    if (o[i] !== s[i]) {
      if (pos >= 0) return false;
      pos = i;
    }
  }
  if (pos < 0) return false;
  const ch = o[pos];
  const ny = s[pos];
  return SUBSTITUTION.some(([a, b]) =>
    (a === ch || a.toUpperCase() === ch.toUpperCase() || a.toLowerCase() === ch.toLowerCase())
    && b === ny);
}

function testSubstitutionParHog2() {
  const data = lasTestData();
  if (!data) return;
  nollstallKorruptionstypByten();
  const { genereraHog, namnpool, mallar } = data;
  const hog = genereraHog({ seed: 'korruption-sub-par', hogtyp: 2, namnpool, kollisionsord: [], mallar });
  const sub = hog.facit.filter((p) => p.korruptionstyp === 'substitution');
  console.log(`Granskade ${sub.length} substitutioner i hög 2`);
  if (sub.length === 0) {
    fail('noll substitutioner att granska');
    return;
  }
  for (const p of sub) {
    if (!matcharSubstitutionPar(p['ursprunglig sträng'], p['skadad sträng'])) {
      fail('substitution utan par i SUBSTITUTION: '
        + JSON.stringify(p['ursprunglig sträng']) + ' -> ' + JSON.stringify(p['skadad sträng']));
      return;
    }
  }
  console.log('OK  varje substitution har par i SUBSTITUTION');
}

function testIngenMellanslagSomInsattning() {
  const data = lasTestData();
  if (!data) return;
  nollstallKorruptionstypByten();
  const { genereraHog, namnpool, mallar } = data;
  const hog = genereraHog({ seed: 'korruption-ins', hogtyp: 2, namnpool, kollisionsord: [], mallar });
  const felaktiga = hog.facit.filter((p) => {
    if (p.korruptionstyp !== 'insättning') return false;
    const orig = p['ursprunglig sträng'];
    const skadad = p['skadad sträng'];
    if (skadad.length !== orig.length + 1) return false;
    for (let i = 0; i < skadad.length; i++) {
      const utan = skadad.slice(0, i) + skadad.slice(i + 1);
      if (utan === orig && skadad[i] === ' ') return true;
    }
    return false;
  });
  console.log(`Granskade ${hog.facit.filter((p) => p.korruptionstyp === 'insättning').length} insättningar`);
  if (felaktiga.length) fail('mellanslag märkt som insättning');
  else console.log('OK  ingen insättning är mellanslag');
}

function testDeterminismHog2() {
  const data = lasTestData();
  if (!data) return;
  nollstallKorruptionstypByten();
  const { genereraHog, namnpool, mallar } = data;
  const seed = 'korruption-det';
  const a = genereraHog({ seed, hogtyp: 2, namnpool, kollisionsord: [], mallar });
  const b = genereraHog({ seed, hogtyp: 2, namnpool, kollisionsord: [], mallar });
  const sa = JSON.stringify(a);
  const sb = JSON.stringify(b);
  if (sa !== sb) fail('samma frö gav olika hög 2 efter korruptionsändring');
  else console.log('OK  determinism oförändrad för hög 2');
}

console.log('Test korruption');
testSubstitutionParHog2();
testIngenMellanslagSomInsattning();
testDeterminismHog2();

if (fel) process.exit(1);
console.log('Alla tester OK');
