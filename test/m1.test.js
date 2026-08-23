#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const repo = path.resolve(__dirname, '..');
let fel = 0;

function fail(msg) {
  console.error(`BRIST: ${msg}`);
  fel++;
}

function listaJs(mapp) {
  const ut = [];
  if (!fs.existsSync(mapp)) return ut;
  for (const namn of fs.readdirSync(mapp)) {
    const full = path.join(mapp, namn);
    if (fs.statSync(full).isDirectory()) ut.push(...listaJs(full));
    else if (namn.endsWith('.js')) ut.push(full);
  }
  return ut;
}

function testImportGrans() {
  const genFiler = listaJs(path.join(repo, 'generator')).filter((f) => !f.endsWith('test/'));
  for (const fil of genFiler) {
    const text = fs.readFileSync(fil, 'utf8');
    if (/require\s*\(\s*['"][^'"]*detektor/.test(text)) {
      fail(`${fil} importerar detektor`);
    }
    if (/require\s*\(\s*['"][^'"]*verktyg/.test(text)) {
      fail(`${fil} importerar verktyg`);
    }
  }
  console.log('OK  ingen modul importerar över mappgräns');
}

function testGeneratorLaserInteDetektor() {
  const genFiler = listaJs(path.join(repo, 'generator'));
  for (const fil of genFiler) {
    const text = fs.readFileSync(fil, 'utf8');
    if (/detektor\/namn/.test(text)) fail(`${fil} refererar detektor/namn/`);
  }
  console.log('OK  generator/ läser aldrig detektor/namn/');
}

function testIngenMathRandom() {
  const mappar = ['generator', 'cli'];
  for (const m of mappar) {
    for (const fil of listaJs(path.join(repo, m))) {
      const text = fs.readFileSync(fil, 'utf8');
      if (/Math\.random/.test(text)) fail(`${fil} anropar Math.random`);
    }
  }
  console.log('OK  ingen fil anropar Math.random');
}

function testReproducerbarhet() {
  const namnpoolPath = path.join(repo, 'generator/namn/namnpool.json');
  if (!fs.existsSync(namnpoolPath)) {
    fail('Saknar namnpool.json — kör verktyg/dela-namnregister.js');
    return;
  }
  const { genereraHog } = require(path.join(repo, 'generator/index.js'));
  const { valjMallar } = require(path.join(repo, 'generator/mallar.js'));
  const { skapaSlump } = require(path.join(repo, 'generator/slump.js'));
  const namnpool = JSON.parse(fs.readFileSync(namnpoolPath, 'utf8'));
  const koll = fs.readFileSync(path.join(repo, 'generator/kollisionslista.md'), 'utf8')
    .split('\n')
    .filter((l) => /^\| [A-ZÅÄÖ]/.test(l))
    .map((l) => ({ ord: l.split('|')[1].trim() }));
  const mallar = valjMallar(skapaSlump('test'));
  const a = genereraHog({ seed: 'rep-test-1', hogtyp: 1, namnpool, kollisionsord: [], mallar });
  const b = genereraHog({ seed: 'rep-test-1', hogtyp: 1, namnpool, kollisionsord: [], mallar });
  const sa = JSON.stringify(a);
  const sb = JSON.stringify(b);
  if (sa !== sb) fail('samma frö gav olika resultat');
  else console.log('OK  samma frö ger identisk hög och identiskt facit');
}

console.log('Test M1');
testImportGrans();
testGeneratorLaserInteDetektor();
testIngenMathRandom();
testReproducerbarhet();

if (fel) process.exit(1);
console.log('Alla tester OK');
