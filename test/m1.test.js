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

function lasTestData() {
  const namnpoolPath = path.join(repo, 'generator/namn/namnpool.json');
  if (!fs.existsSync(namnpoolPath)) {
    fail('Saknar namnpool.json — kör verktyg/dela-namnregister.js');
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
  const mallar = valjMallar(skapaSlump('test'));
  return { genereraHog, namnpool, kollisionsord: koll, mallar };
}

function testReproducerbarhet() {
  const data = lasTestData();
  if (!data) return;
  const { genereraHog, namnpool, kollisionsord, mallar } = data;
  const a = genereraHog({ seed: 'rep-test-1', hogtyp: 1, namnpool, kollisionsord: [], mallar });
  const b = genereraHog({ seed: 'rep-test-1', hogtyp: 1, namnpool, kollisionsord: [], mallar });
  const sa = JSON.stringify(a);
  const sb = JSON.stringify(b);
  if (sa !== sb) fail('samma frö gav olika resultat');
  else console.log('OK  samma frö ger identisk hög och identiskt facit');
}

function testPlantId() {
  const data = lasTestData();
  if (!data) return;
  const { genereraHog, namnpool, mallar } = data;
  const seed = 'plant-id-test-42';
  const hog1 = genereraHog({ seed, hogtyp: 1, namnpool, kollisionsord: [], mallar });
  const hog2 = genereraHog({ seed, hogtyp: 2, namnpool, kollisionsord: [], mallar });

  for (const [label, hog] of [['hög 1', hog1], ['hög 2', hog2]]) {
    const n = hog.facit.length;
    console.log(`Granskade ${n} facitposter i ${label}`);
    if (n === 0) {
      fail(`${label}: inga facitposter att granska`);
      continue;
    }
    const utan = hog.facit.filter((p) => !p.plant_id);
    if (utan.length) fail(`${label}: ${utan.length} facitposter saknar plant_id`);
    else console.log(`OK  varje facitpost i ${label} har plant_id`);
    const ids = hog.facit.map((p) => p.plant_id);
    const unika = new Set(ids);
    if (unika.size !== ids.length) {
      fail(`${label}: plant_id är inte unikt (${ids.length} poster, ${unika.size} unika)`);
    } else console.log(`OK  plant_id är unikt inom ${label}`);
  }

  const n1 = hog1.facit.length;
  const n2 = hog2.facit.length;
  if (n1 && n2) {
    const set1 = new Set(hog1.facit.map((p) => p.plant_id));
    const set2 = new Set(hog2.facit.map((p) => p.plant_id));
    if (set1.size !== set2.size || [...set1].some((id) => !set2.has(id))) {
      fail('hög 1 och hög 2 har olika plant_id-mängder');
    } else {
      console.log(`OK  hög 1 och hög 2 har identisk plant_id-mängd (${set1.size} id)`);
    }

    const map1 = new Map(hog1.facit.map((p) => [p.plant_id, p]));
    const map2 = new Map(hog2.facit.map((p) => [p.plant_id, p]));
    let parade = 0;
    let felStrang = 0;
    for (const id of set1) {
      if (map2.has(id)) {
        parade++;
        if (map1.get(id)['ursprunglig sträng'] !== map2.get(id)['ursprunglig sträng']) {
          felStrang++;
        }
      }
    }
    console.log(`Granskade ${parade} parade poster på plant_id mellan hög 1 och hög 2`);
    if (parade === 0) fail('ingen parade poster på plant_id');
    else if (parade !== 1000) fail(`parning på plant_id gav ${parade} av 1000, förväntat 1000`);
    else console.log('OK  parning på plant_id ger 1000 av 1000');
    if (felStrang) fail(`${felStrang} parade poster har olika ursprunglig sträng`);
    else if (parade > 0) console.log('OK  parade poster har samma ursprunglig sträng');
  }

  const a = genereraHog({ seed, hogtyp: 1, namnpool, kollisionsord: [], mallar });
  const b = genereraHog({ seed, hogtyp: 1, namnpool, kollisionsord: [], mallar });
  const idsA = a.facit.map((p) => p.plant_id);
  const idsB = b.facit.map((p) => p.plant_id);
  console.log(`Granskade ${idsA.length} plant_id vid omkörning med samma frö`);
  if (idsA.length === 0) fail('ingen plant_id vid omkörning');
  else if (JSON.stringify(idsA) !== JSON.stringify(idsB)) fail('samma frö gav olika plant_id');
  else console.log('OK  samma frö ger identiska plant_id');
}

console.log('Test M1');
testImportGrans();
testGeneratorLaserInteDetektor();
testIngenMathRandom();
testReproducerbarhet();
testPlantId();

if (fel) process.exit(1);
console.log('Alla tester OK');
